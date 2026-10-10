import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { readHtmlFile, HtmlFileError, MAX_HTML_CHARS, type HtmlFileData } from "./HtmlFile";

export interface HtmlPreviewProps {
  /** Start with HTML already loaded (e.g. from props, an API, or a string). */
  initialValue?: HtmlFileData | null;
  /** Fires with the object (including the HTML code) each time a file is imported. */
  onLoad?: (data: HtmlFileData) => void;
  /** Fires after the user confirms clearing the loaded file. */
  onClear?: () => void;
}

type DeviceId = "desktop" | "tablet" | "mobile";

interface Device {
  id: DeviceId;
  label: string;
  width: string;
}

const DEVICES: readonly Device[] = [
  { id: "desktop", label: "Máy Tính", width: "100%" },
  { id: "tablet", label: "Máy Tính Bảng", width: "768px" },
  { id: "mobile", label: "Điện Thoại", width: "390px" },
];

export default function HtmlPreview({ initialValue = null, onLoad, onClear }: HtmlPreviewProps) {
  const [file, setFile] = useState<HtmlFileData | null>(initialValue);
  const [error, setError] = useState<string>("");
  const [confirming, setConfirming] = useState<boolean>(false);
  const [dragging, setDragging] = useState<boolean>(false);
  const [device, setDevice] = useState<DeviceId>("desktop");
  const [allowScripts, setAllowScripts] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = useCallback(
    async (f: File | undefined | null) => {
      setError("");
      if (!f) return;
      try {
        const data = await readHtmlFile(f);
        setFile(data);
        setConfirming(false);
        setReloadKey((k) => k + 1);
        onLoad?.(data);
      } catch (err) {
        setError(err instanceof HtmlFileError ? err.message : "Couldn't read that file.");
      }
    },
    [onLoad]
  );

  const confirmClear = () => {
    setFile(null);
    setError("");
    setConfirming(false);
    onClear?.();
  };

  const onDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    setDragging(false);
    void readFile(e.dataTransfer.files?.[0]);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    void readFile(e.target.files?.[0]);
    e.target.value = ""; // allow re-selecting the same file
  };

  // Changing the sandbox flags requires a fresh iframe, so the toggle
  // is folded into the key instead of an effect-driven remount.
  const sandbox = useMemo<string>(
    () => (allowScripts ? "allow-scripts allow-forms allow-popups" : ""),
    [allowScripts]
  );

  const deviceWidth = DEVICES.find((d) => d.id === device)?.width ?? "100%";

  return (
    <div className="hp-root">
      <style>{css}</style>

      <header className="hp-bar">
        <div className="hp-file">
          {file ? (
            <>
              <strong title={file.name}>{file.name}</strong>
              <span>{formatSize(file.size)}</span>
            </>
          ) : (
            <span>Không có file</span>
          )}
        </div>

        <div className="hp-count" aria-live="polite">
          HTML: {file?.html.length ?? 0}/{MAX_HTML_CHARS}
        </div>

        <div className="hp-group" role="group" aria-label="Preview width">
          {DEVICES.map((d) => (
            <button
              key={d.id}
              type="button"
              className={"hp-btn" + (device === d.id ? " is-on" : "")}
              aria-pressed={device === d.id}
              onClick={() => setDevice(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>

        <label className="hp-check">
          <input
            type="checkbox"
            checked={allowScripts}
            onChange={(e) => setAllowScripts(e.target.checked)}
          />
          Chạy script
        </label>

        <button
          type="button"
          className="hp-btn"
          disabled={!file}
          onClick={() => setReloadKey((k) => k + 1)}
        >
          Tải lại
        </button>
        <button
          type="button"
          className="hp-btn hp-primary"
          onClick={() => inputRef.current?.click()}
        >
          {file ? "Thay thế tệp" : "Chọn tệp"}
        </button>
        <button
          type="button"
          className="hp-btn"
          disabled={!file}
          onClick={() => setConfirming(true)}
        >
          Xóa
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".html,.htm,text/html"
          hidden
          onChange={onPick}
        />
      </header>

      {confirming && file && (
        <div className="hp-error" role="alert">
          Xóa file này?
          <button
            type="button"
            className="hp-btn"
            onClick={() => setConfirming(false)}
          >
            Hủy
          </button>
          <button
            type="button"
            className="hp-btn hp-primary"
            onClick={confirmClear}
          >
            Xóa
          </button>
        </div>
      )}

      {error && (
        <div className="hp-error" role="alert">
          {error}
        </div>
      )}

      <main
        className={"hp-stage" + (dragging ? " is-drag" : "")}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {file ? (
          <iframe
            key={`${reloadKey}-${allowScripts ? "scripts" : "noscripts"}`}
            title={`Preview of ${file.name}`}
            className="hp-frame"
            style={{ width: deviceWidth }}
            sandbox={sandbox}
            srcDoc={file.html}
          />
        ) : (
          <div className="hp-empty">
            <p className="hp-empty-title">Kéo thả tệp HTML</p>
            <p>hoặc chọn một tệp từ máy tính của bạn để xem nó được hiển thị.</p>
            <button
              type="button"
              className="hp-btn hp-primary"
              onClick={() => inputRef.current?.click()}
            >
              Chọn tệp
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const css = `
.hp-root{display:flex;flex-direction:column;height:100vh;min-height:480px;
  font:14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1d2433;background:#e9ecf1}
.hp-bar{display:flex;align-items:center;gap:12px;padding:10px 14px;background:#fff;
  border-bottom:1px solid #d5dae3;flex-wrap:wrap}
.hp-file{flex:1;min-width:140px;display:flex;gap:10px;align-items:baseline;overflow:hidden}
.hp-file strong{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hp-file span{color:#6b7385;white-space:nowrap}
.hp-count{font-variant-numeric:tabular-nums;color:#4a5266;white-space:nowrap}
.hp-group{display:flex;border:1px solid #c6ccd8;border-radius:6px;overflow:hidden}
.hp-group .hp-btn{border:0;border-radius:0;border-right:1px solid #c6ccd8}
.hp-group .hp-btn:last-child{border-right:0}
.hp-btn{font:inherit;padding:6px 12px;border:1px solid #c6ccd8;border-radius:6px;
  background:#fff;color:inherit;cursor:pointer}
.hp-btn:hover:not(:disabled){background:#f2f4f8}
.hp-btn:disabled{opacity:.45;cursor:not-allowed}
.hp-btn.is-on{background:#1f3a5f;color:#fff}
.hp-primary{background:#1f3a5f;border-color:#1f3a5f;color:#fff}
.hp-primary:hover:not(:disabled){background:#2a4b7a}
.hp-btn:focus-visible,.hp-check input:focus-visible{outline:2px solid #3b7ddd;outline-offset:2px}
.hp-check{display:flex;align-items:center;gap:6px;cursor:pointer}
.hp-error{padding:8px 14px;background:#fdecec;color:#8a1c1c;border-bottom:1px solid #f3c3c3}
.hp-error .hp-btn{margin-left:8px}
.hp-stage{flex:1;display:flex;justify-content:center;overflow:auto;padding:16px;
  transition:background .15s}
.hp-stage.is-drag{background:#d8e4f6}
.hp-frame{height:100%;max-width:100%;border:1px solid #c6ccd8;border-radius:4px;background:#fff;
  box-shadow:0 1px 3px rgba(20,30,50,.12);transition:width .2s}
.hp-empty{align-self:center;text-align:center;max-width:340px;padding:32px;
  border:2px dashed #aab3c4;border-radius:10px;color:#4a5266}
.hp-empty p{margin:0 0 8px}
.hp-empty .hp-btn{margin-top:10px}
.hp-empty-title{font-size:18px;font-weight:600;color:#1d2433}
@media (prefers-reduced-motion:reduce){.hp-frame,.hp-stage{transition:none}}
`;
