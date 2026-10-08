---
name: Back-Office Operations System
colors:
  surface: '#f7f9ff'
  surface-dim: '#c8dcf4'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#edf4ff'
  surface-container: '#e3efff'
  surface-container-high: '#d9eaff'
  surface-container-highest: '#d1e4fd'
  on-surface: '#081d2f'
  on-surface-variant: '#404754'
  inverse-surface: '#1f3245'
  inverse-on-surface: '#e8f1ff'
  outline: '#717785'
  outline-variant: '#c0c6d6'
  surface-tint: '#005eb3'
  primary: '#005baf'
  on-primary: '#ffffff'
  primary-container: '#0074db'
  on-primary-container: '#fefcff'
  inverse-primary: '#a8c8ff'
  secondary: '#505f79'
  on-secondary: '#ffffff'
  secondary-container: '#d1e0ff'
  on-secondary-container: '#54637d'
  tertiary: '#006947'
  on-tertiary: '#ffffff'
  tertiary-container: '#00855b'
  on-tertiary-container: '#f5fff6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#a8c8ff'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#004689'
  secondary-fixed: '#d5e3ff'
  secondary-fixed-dim: '#b8c7e5'
  on-secondary-fixed: '#0c1c32'
  on-secondary-fixed-variant: '#394760'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f7f9ff'
  on-background: '#081d2f'
  surface-variant: '#d1e4fd'
  primary-hover: '#0070D2'
  primary-light: '#E5F3FF'
  sidebar-base: '#1B2A41'
  sidebar-dark: '#111C2D'
  sidebar-hover: '#243B5A'
  sidebar-active-link: '#4DA3FF'
  canvas-bg: '#F4F6F8'
  surface-card: '#FFFFFF'
  border-card: '#E0E6ED'
  text-primary: '#182538'
  text-secondary: '#5C6F84'
  text-muted: '#8C9BA5'
  status-success: '#10B981'
  status-danger: '#EF4444'
  status-warning: '#F59E0B'
  status-info: '#0088FF'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  data-mono:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 16px
  gutter-desktop: 20px
  margin: 16px
  margin-desktop: 24px
  space-xs: 4px
  space-sm: 8px
  space-md: 12px
  space-lg: 16px
  space-xl: 24px
---

## Brand & Style

This design system defines a high-density, multi-tenant enterprise e-commerce and retail management environment. Designed for daily operational throughput, it serves inventory managers, store owners, customer support agents, and fulfillment teams processing hundreds of transactions per shift.

The visual style blends **Corporate / Modern** discipline with **Dense Functionalism**:
- **Utilitarian Speed:** Layouts prioritize immediate scannability, minimal unnecessary whitespace, and instant access to bulk operational actions.
- **Cognitive Clarity:** Muted backgrounds (`#F4F6F8`) frame pristine white cards (`#FFFFFF`), while deep slate typography provides sharp contrast for Vietnamese diacritics and complex tabular data.
- **Architectural Contrast:** A dark navy operational spine anchors global navigation on the left, maintaining clear context switching between sales channels, products, inventory, and analytics.

## Colors

The palette balances operational calm with decisive actionable triggers.

- **Primary (`#0088FF`):** Reserved strictly for primary intents, active states, and confirmed links. Interactive hover transitions to `#0070D2`, while `#E5F3FF` isolates selected table rows, active filters, and light badge backgrounds.
- **Sidebar Navy (`#1B2A41` to `#111C2D`):** Encapsulates the application shell, creating clear separation between operational navigation and content workspace. Hover states use `#243B5A`, with active text illuminated by `#4DA3FF`.
- **Canvas & Surface:** Backgrounds settle at neutral light gray (`#F4F6F8`), preventing eye fatigue during extended screen use. Cards and overlays leverage crisp `#FFFFFF` bounded by a strict 1px border (`#E0E6ED`).
- **Data States & Status:** Functional status colors (`#10B981` success, `#EF4444` danger, `#F59E0B` warning) are reserved exclusively for stock indicators, order statuses, and system alerts. They are never used decoratively.

## Typography

The type scale is standardized on **Inter** to ensure uniform visual metrics, strict vertical alignment across dense multi-column grids, and flawless rendering of complex Vietnamese tone accents (dấu câu).

- **Data Alignment & Metrics:** All numeric values, currency notations (VND), SKU codes, and quantities must render using tabular lining figures (`font-feature-settings: 'tnum' 1, 'cv05' 1`) to preserve column vertical stacking.
- **Information Density:** The core workhorse is `body-md` (14px/20px) for general forms and table entries, with `body-sm` (13px/18px) handling secondary meta-information and auxiliary table cell descriptions.
- **Hierarchy:** Page titles utilize `headline-xl` (24px). Section headers inside cards standardize on `headline-md` (16px) semi-bold.

## Layout & Spacing

The administrative shell employs an asymmetrical structural framework designed around an explicit back-office content workflow:

- **Global Shell:** A persistent fixed left navigation sidebar (width: 240px desktop, collapsible to 64px icon-rail) paired with a responsive workspace header (height: 56px).
- **Page Canvas:** Structured with a max-width clamp of 1440px on the main workspace container or 100% fluid within data grids, flanked by a 24px margin on desktop and 16px on mobile/tablets.
- **Form Workflows:** Standardizes on a 70/30 asymmetric two-column grid. The wide 70% primary column encapsulates the core multi-section forms (e.g., General Information, Variants, Media, Inventory Levels), while the 30% rail retains contextual configuration (Product Organization, Channels, SEO preview, Tags).
- **Rhythm:** Spacing follows an exact 4px sub-grid. Internal card padding is consistently 16px or 20px, while gap tokens inside form groups standardize to 16px vertical spacing.

## Elevation & Depth

Depth in this system is low-key and structural, avoiding decorative floating effects in favor of clean operational planes:

- **Level 0 (Canvas):** Background baseline at `#F4F6F8`.
- **Level 1 (Cards & Panels):** Pure white `#FFFFFF` bounded by a 1px solid `#E0E6ED` stroke, supported by an ultra-subtle base shadow: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`.
- **Level 2 (Popovers, Filter Menus & Date Pickers):** Floating contextual layers utilize `0 4px 12px 0 rgba(24, 37, 56, 0.10)` bounded by a 1px `#E0E6ED` border.
- **Level 3 (Modals & Slide-over Drawers):** High-priority tasks sit above an overlay (`rgba(17, 28, 45, 0.5)`), casting `0 12px 32px 0 rgba(24, 37, 56, 0.16)`.
- **Sticky Footers:** The action bottom bar pins to the bottom viewport with a 1px top border `#E0E6ED` and an upward diffused drop shadow `0 -2px 8px 0 rgba(0, 0, 0, 0.04)`.

## Shapes

The interface maintains a disciplined, crisp architectural geometry:

- **Border Radii:** Standard cards, form inputs, button components, and filter controls adopt a unified 6px radius (`0.375rem`), aligning to roundedness level 1.
- **Pill Badges:** Status chips and stock notification tags exclusively employ a 12px / fully rounded geometry to instantly distinguish micro-status pills from rectangular input boxes and actionable buttons.
- **Strict Outlines:** Outer borders are strictly 1px with no offset, reinforcing alignment down dense spreadsheet-like column lines.

## Components

### Buttons
- **Primary:** Solid `#0088FF` background, `#FFFFFF` text, height 36px, 12px horizontal padding, 6px radius. Hover: `#0070D2`. Active: `#005FB3`.
- **Secondary / Default:** `#FFFFFF` background, 1px border `#E0E6ED`, `#182538` text. Hover: `#F4F6F8` surface, border `#CBD5E1`.
- **Danger:** White surface with 1px `#EF4444` border and `#EF4444` text, or solid `#EF4444` with `#FFFFFF` text for permanent delete confirmation.
- **Action Footers:** Fixed sticky bar spanning the viewport base containing left-aligned contextual feedback and right-aligned dual actions: "Hủy" (Secondary button) and "Lưu" (Primary button).

### Data Tables & Bulk Actions
- **Header:** Height 40px, `#F4F6F8` background, uppercase 12px `#5C6F84` typography, bottom border 1px solid `#E0E6ED`.
- **Rows:** Default height 48px, compact density height 38px. Border bottom 1px `#E0E6ED`. Hover background `#F8FAFC`. Selected row background `#E5F3FF`.
- **Selection:** First column strictly allocated to checkboxes (16x16px). When rows are checked, the table header swaps dynamically to display selected count and bulk action triggers (e.g., "Xoá", "Cập nhật trạng thái").
- **Numbers:** Tabular numbers, right-aligned with currency unit VND muted.

### Filter Bars & Search
- Integrated composite bar anchored directly above tables: 100% width, segmented with unified text search on the left, multi-attribute filter dropdown triggers (Trạng thái, Loại sản phẩm, Kênh bán) in the middle, and display column toggles on the right.

### Input Fields & Controls
- **Inputs:** Height 36px, font size 14px, 1px solid `#E0E6ED`, 8px padding. Focused: 1px solid `#0088FF` with 2px outer glow `rgba(0, 136, 255, 0.2)`. Placeholder text in `#8C9BA5`.
- **Checkboxes & Radios:** 16x16px box, 1px solid `#CBD5E1`, filling `#0088FF` with a crisp white glyph when checked.

### Tabs
- Horizontal orientation, borderless background with a continuous 1px bottom baseline `#E0E6ED`. Active tab receives `#0088FF` label color and an explicit 2px bottom border underline in `#0088FF`.

### Media Uploader
- Dashed bounding box: 2px dashed `#CBD5E1`, background `#F8FAFC`, radius 6px. Drag-active state shifts border and canvas tint to `#0088FF` and `#E5F3FF`.

### SEO Preview Card
- Contained module simulating live search engine snippets: Blue title link (`#1A0DAB`, 18px), green URL path (`#006621`, 13px), and dark gray meta description snippet (`#545454`, 13px), with real-time character count indicators.