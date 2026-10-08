export type NewsStatus = 'published' | 'draft' | 'pinned'

export interface MockNews {
  id: string
  coverUrl: string
  title: string
  author: string
  tags: string[]
  publishedAt: string
  views: number
  status: NewsStatus
}

export const MOCK_NEWS: MockNews[] = [
  { id: 'n1', coverUrl: '', title: 'Máy toàn đạc điện tử Leica TS07 — hướng dẫn hiệu chuẩn', author: 'Trần Hoàng Quân', tags: ['thiết bị', 'hướng dẫn'], publishedAt: '2026-09-28', views: 1240, status: 'pinned' },
  { id: 'n2', coverUrl: '', title: 'So sánh máy GPS RTK 2 tần số cho đo đạc địa chính', author: 'Lê Văn Thắng', tags: ['thiết bị', 'so sánh'], publishedAt: '2026-09-25', views: 986, status: 'published' },
  { id: 'n3', coverUrl: '', title: 'Khuyến mãi tháng 10: giảm giá máy thủy bình', author: 'Nguyễn Thu Trang', tags: ['khuyến mãi'], publishedAt: '2026-10-01', views: 2310, status: 'published' },
  { id: 'n4', coverUrl: '', title: 'Quy trình đo vẽ bản đồ địa hình tỷ lệ 1:500', author: 'Trần Hoàng Quân', tags: ['quy trình', 'địa hình'], publishedAt: '2026-09-12', views: 754, status: 'published' },
  { id: 'n5', coverUrl: '', title: 'Bảo trì máy kinh vĩ đúng cách kéo dài tuổi thọ', author: 'Lê Văn Thắng', tags: ['bảo trì'], publishedAt: '2026-08-30', views: 432, status: 'published' },
  { id: 'n6', coverUrl: '', title: 'Thông báo nghỉ lễ và lịch hỗ trợ kỹ thuật', author: 'Ban Biên Tập', tags: ['thông báo'], publishedAt: '2026-09-02', views: 321, status: 'published' },
  { id: 'n7', coverUrl: '', title: 'Ứng dụng flycam trong khảo sát địa hình mỏ', author: 'Trần Hoàng Quân', tags: ['flycam', 'khảo sát'], publishedAt: '2026-10-05', views: 112, status: 'draft' },
  { id: 'n8', coverUrl: '', title: 'Giải đáp: sai số khép vòng trong lưới khống chế', author: 'Lê Văn Thắng', tags: ['kỹ thuật', 'hỏi đáp'], publishedAt: '2026-09-18', views: 668, status: 'published' },
  { id: 'n9', coverUrl: '', title: 'Mở bán máy quét laser 3D mới nhất', author: 'Nguyễn Thu Trang', tags: ['thiết bị', 'tin mới'], publishedAt: '2026-10-07', views: 45, status: 'draft' },
  { id: 'n10', coverUrl: '', title: 'Chính sách bảo hành thiết bị trắc địa Thiên Phú', author: 'Ban Biên Tập', tags: ['chính sách'], publishedAt: '2026-07-15', views: 1890, status: 'published' },
]
