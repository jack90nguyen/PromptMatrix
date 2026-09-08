# MEMORY

Quyết định đã chốt cho project này, kèm lý do. Đọc file này trước khi định đổi
mấy thứ bên dưới — phần lớn đã được cân nhắc rồi, không phải sơ suất.

## Build & deploy

- **`npm run build` phải giữ cờ `--webpack`.** Turbopack externalise `pg` và
  `@prisma/client` thành tên gắn hash (`pg-587764f78a6c7a9c`), chỉ resolve được
  với đúng cây `node_modules` lúc build. Deploy build ở local rồi ship `.next`
  sang server có cây prod-only riêng → mọi route cần DB trả 500, log đầy
  `Cannot find module 'pg-<hash>'`. Chi tiết: README mục *Why the build uses
  webpack*.
- **Server không build.** Build ở máy dev, rsync `.next` sang. Lần đầu trên máy
  mới phải `npm install --omit=dev --no-save` — không dùng được `npm ci` vì
  lockfile thiếu biến thể Linux của optional dep thuộc `@tailwindcss/oxide`.
- **Migration đi đường thủ công.** Role `promptx` không có `CREATEDB` nên
  `prisma migrate dev` fail (`P3014`, không tạo được shadow database). Dùng
  `npm run db:migrate:create` / `db:migrate:apply` (xem
  `scripts/migrate-manual.mjs`). Fix gốc là `ALTER ROLE promptx CREATEDB;` bằng
  user superuser — chưa làm.
- **Sandbox dùng chung database với máy dev.** Sửa prompt ở local là production
  đổi theo ngay, không có staging. Biết mà vẫn chọn vậy vì tool nội bộ.

## API

- **API key nằm trong query string** (`?key=...`), có hỗ trợ thêm
  `Authorization: Bearer`. Anh Thành chọn query string để n8n / Google Sheets
  gọi được dễ. Đánh đổi: key bị ghi vào access log, browser history, header
  `Referer`.
- **Không có rate limit** — quyết định có chủ ý, app dùng nội bộ. Đã nêu rủi ro
  2 lần, anh Thành chốt bỏ qua. Đừng đề xuất lại.
- **Tham số sai giá trị trả 400**, không âm thầm hiểu thành mặc định — để một
  lỗi gõ sai không lặng lẽ trả prompt khác ý người gọi.
- Tài liệu cho người tích hợp: `docs/API.md` (tiếng Việt).

## Compose

- **Tuỳ chọn nằm trong `composePrompt`, không viết riêng ở route.** Màn hình và
  endpoint dùng chung một hàm nên không thể lệch kết quả. Thêm tuỳ chọn mới thì
  thêm vào đó, đừng nhân bản logic sang API.
- **Mặc định có tiêu đề `## <tên mảnh>`.** Một tag kéo về nhiều mảnh, mảnh nào
  cũng mở đầu `Next action:` / `Template:` — không tiêu đề thì AI không có căn
  cứ để hiểu đây là nhiều tình huống riêng biệt.

## UI

- **Prompts mặc định là graph view**, `?view=cards` để xem masonry.
- **Modal edit prompt cố tình KHÔNG nằm trong URL.** Nếu đi qua `?edit=<id>`
  thì server component re-render → graph mount lại → layout nhảy mỗi lần click
  node. State nằm ở client, nạp bằng server action.
- **Matrix view đã bị bỏ khỏi Composer** (commit `ad6adbc`). `MatrixGrid.tsx` và
  `src/lib/matrix.ts` đã xoá. Cần lại thì lấy từ git history.
- **Masonry tự viết** (`src/components/Masonry.tsx`), đo chiều cao thật rồi nhồi
  vào cột ngắn nhất. Không dùng CSS `columns` vì nó xếp theo cột, làm thứ tự đọc
  không còn khớp `sortOrder`.
- Ngưỡng đã chọn theo cảm nhận, sửa được: graph tự tắt label prompt khi **> 40
  node**; danh sách tag hiện ô search khi **> 12 tag**; graph trần **500** node.
- **Icon miễn trừ khỏi proxy auth.** `src/proxy.ts` phải chừa `icon.png` và
  `apple-icon.png` — browser xin favicon ngay ở trang login lúc chưa có session,
  không chừa thì nó nhận redirect thay vì ảnh.

## Dữ liệu

- Kho prompt CS import từ Lark Base, bảng *Ticket AI Label*. Script
  `scripts/import-lark-tickets.ts`, **chạy lại được** (match theo category +
  title). Mapping và giới hạn: README mục *Importing from Lark Base*.
- **Tồn đọng đã biết:** 91 prompt nằm trong đúng 1 category `Ticket Label`, nên
  graph là hình sao 91 tia — đúng hình của data, code không chữa được. Tách
  category ra mới có nghĩa; cột `AI Label` trong Lark đã sẵn cấu trúc 2 tầng.
- **Tồn đọng đã biết:** tag `shipping-inquiry` gom 16 mảnh → prompt hơn 17.000
  ký tự. Cần bên CS chia tag nhỏ hơn, không phải việc của code.
