# Payroll Hub App

Đây là ứng dụng quản lý, đối soát và báo cáo (Payroll/Audit Hub) được xây dựng bằng React (Vite) và Tailwind CSS.

## Hướng dẫn đưa lên Vercel (Deploy)

Dự án này đã được cấu hình sẵn một file `vercel.json` phục vụ cho React Router (SPA) giúp các đường dẫn (routes) không bị lỗi 404 khi truy cập trực tiếp.

### Cách 1: Deploy qua GitHub (Khuyên dùng)
1. Push toàn bộ source code này lên một repository của bạn trên GitHub, GitLab, hoặc Bitbucket.
2. Đăng nhập vào trang chủ [Vercel](https://vercel.com).
3. Nhấp vào **"Add New..."** > **"Project"** và import repository vừa tạo.
4. Vercel sẽ tự động phát hiện project sử dụng **Vite**. (Nếu không, trong phần *Framework Preset*, hãy chọn **Vite**).
   - *Build Command*: `npm run build` hoặc `vite build`
   - *Output Directory*: `dist`
   - *Install Command*: `npm install`
5. Nhấp **Deploy** và chờ đợi một lát để dự án được public.

### Cách 2: Deploy trực tiếp bằng Vercel CLI
Nếu máy tính của bạn đã cài đặt Node.js và bạn muốn deploy qua Command Line:

1. Mở terminal và cài đặt Vercel CLI:
   ```bash
   npm i -g vercel
   ```
2. Đăng nhập vào Vercel từ terminal:
   ```bash
   vercel login
   ```
3. Đứng ở thư mục gốc của project này và chạy lệnh:
   ```bash
   vercel
   ```
4. Xác nhận các tùy chọn hiển thị trên terminal (nhấn Enter cho các giá trị mặc định). Vercel sẽ tải dự án hiển thị cho bạn đường link dự án. 
   - Để deploy bản chính thức (production), chạy tiếp lệnh:
   ```bash
   vercel --prod
   ```

## Development
- `npm install` để cài đặt thư viện.
- `npm run dev` để chạy môi trường code.
- `npm run build` để đóng gói sinh ra file chạy production.
