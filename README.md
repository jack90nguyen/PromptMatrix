# Prompt Matrix

Kho **mảnh prompt** (prompt fragment) nhỏ, dùng lại được. Lọc theo category +
tag, app ghép các mảnh khớp điều kiện thành **một prompt hoàn chỉnh** để dán vào
tool AI sinh text / ảnh / video.

Tài liệu API cho người tích hợp: **[docs/API.md](docs/API.md)**.
Các quyết định đã chốt và lý do: **[MEMORY.md](MEMORY.md)**.

## Luật ghép prompt

Chọn một category, rồi chọn tag. Một mảnh được lấy khi:

- nó là **base fragment** (`isBase`) — luôn được lấy cho category của nó, hoặc
- **chế độ OR** (mặc định): nó mang ít nhất một trong các tag đã chọn, hoặc
- **chế độ AND**: nó mang **đủ** tất cả tag đã chọn.

Các mảnh khớp được sắp theo `sortOrder`, rồi tới title, và nối với nhau bằng một
dòng trống. Mỗi mảnh có title đứng trên dưới dạng heading H2 của markdown:

```
## Mug 11oz - specs and print area
Product: 11oz ceramic mug, white glossy finish, C-handle.

## Photo upload - customer requirements
This product is personalized from a photo the customer uploads.
```

Dòng heading cho model một ranh giới nhìn thấy được giữa các mảnh, thay vì một
khối chữ liền mà nhiều chỉ dẫn dính vào nhau. Tắt được — checkbox `titles` trong
Composer, hoặc `titles=0` trên API. Từng mảnh cũng bỏ tick được trước khi copy.

## Các màn hình

**Composer** gồm ô chọn category, các chip tag kèm công tắc OR/AND, danh sách
mảnh có checkbox, và phần output đã ghép. Chọn category → siết lại bằng tag →
bỏ tick mảnh không cần → copy.

**Prompts** mở ra là graph force-directed của cả kho:

- **category** là hình tròn tô đặc, to nhỏ theo số prompt nó chứa
- **prompt** là hình tròn nhỏ, ăn màu của category cha, có viền vàng nếu là base
  fragment và mờ đi nếu đang inactive
- **tag** là hình thoi rỗng ruột

Prompt nối vào category của nó (nét liền) và vào mọi tag nó mang (nét đứt). Nhờ
vậy hai prompt ở hai category khác nhau mà chung tag sẽ **gặp nhau tại node
tag** — hai màu khác nhau chụm vào một hình thoi chính là thứ view này tồn tại
để cho thấy. Prompt **không bao giờ** nối trực tiếp với nhau: một tag có N
prompt thì cách đó tốn N(N-1)/2 cạnh, so với N cạnh khi đi qua node tag.

Kéo node, scroll để zoom, kéo nền để pan; hover thì mọi thứ không liên quan mờ
đi. Click prompt là mở nó ra, click category hoặc tag là lọc theo cái đó. Hai
slider tác động vào simulation đang chạy.

`?view=cards` chuyển sang masonry dạng card, mỗi card hiện phần đầu của body.
Hai view **dùng chung bộ filter** — category, tag (OR/AND), search chữ, status,
base-only — và mọi filter nằm trong URL nên bookmark hoặc gửi link được.

**New / edit prompt** tạo được category hoặc tag ngay tại chỗ: link `+ New
category` và `+ New tag` ghi row vào DB luôn rồi chọn nó, nên thêm một mảnh
không bao giờ bắt bạn rời màn hình. Đổi lại, form bỏ dở có thể để lại một
category hoặc tag rỗng — cả hai đều xoá được.

## Stack

- Next.js (App Router) + React + TypeScript
- PostgreSQL + Prisma 7 (qua driver adapter `@prisma/adapter-pg`)
- Tailwind CSS v4, theme chỉ có dark (token trong `src/app/globals.css`)
- `d3-force` cho layout graph; zoom, pan và kéo node thì tự viết
- Auth: username + password trong DB, session cookie là JWT có ký (`jose`),
  password băm bằng `scrypt`

## Cài đặt

```bash
npm install
cp .env.example .env      # roi dien gia tri vao
npx prisma generate       # client sinh ra bi git-ignore
npm run db:migrate        # tao schema (doc luu y ben duoi)
npm run db:seed           # tao admin + data mau
npm run dev
```

### Migration khi role không có CREATEDB

`prisma migrate dev` cần một shadow database, nên nó fail với `P3014` khi role
DB không có quyền tạo database. Hai đường:

**Nên làm** — cấp quyền một lần bằng user superuser, rồi dùng
`npm run db:migrate`:

```sql
ALTER ROLE your_app_role CREATEDB;
```

**Không cần thêm quyền gì** — diff DB đang chạy với schema:

```bash
npm run db:migrate:create -- add_something   # ghi ra prisma/migrations/<stamp>_add_something
# doc ky SQL no in ra
npm run db:migrate:apply -- prisma/migrations/<stamp>_add_something
```

Cách này vẫn sinh ra migration file thật, nên `npm run db:deploy` lúc lên
production vẫn đúng chuẩn. Nhưng vì diff lấy từ DB đang chạy chứ không từ lịch
sử migration, **đổi tên một column sẽ ra thành `DROP` + `ADD` — tức là mất
data**. Luôn đọc SQL trước khi apply.

### Biến môi trường

| Biến             | Công dụng                                          |
| ---------------- | -------------------------------------------------- |
| `DATABASE_URL`   | Connection string PostgreSQL                       |
| `SESSION_SECRET` | Khoá ký JWT — sinh bằng `openssl rand -hex 32`     |
| `ADMIN_USERNAME` | Admin khởi tạo, do `npm run db:seed` tạo ra        |
| `ADMIN_PASSWORD` | Password của admin khởi tạo                        |

`db:seed` idempotent: nó upsert admin, và chỉ chèn data mẫu khi chưa có category
nào.

## Scripts

| Script                      | Công dụng                                   |
| --------------------------- | ------------------------------------------- |
| `npm run dev`               | Dev server                                  |
| `npm run build`             | Build production (webpack — xem mục dưới)   |
| `npm run start`             | Chạy bản build production                   |
| `npm run typecheck`         | `tsc --noEmit`                              |
| `npm run db:migrate`        | `prisma migrate dev` (cần CREATEDB)         |
| `npm run db:migrate:create` | Sinh migration bằng cách diff DB đang chạy  |
| `npm run db:migrate:apply`  | Apply và ghi nhận migration đã sinh         |
| `npm run db:deploy`         | `prisma migrate deploy` (production)        |
| `npm run db:seed`           | Seed admin + data mẫu                       |
| `npm run db:studio`         | Prisma Studio                               |

Prisma cấu hình trong `prisma7.config.ts` (Prisma 7 giữ datasource URL ở đó,
không nằm trong `schema.prisma`) và nói chuyện với PostgreSQL qua driver adapter
`@prisma/adapter-pg`. Client sinh ra nằm ở `src/generated/prisma` và bị
git-ignore.

`AGENTS.md` với `CLAUDE.md` ở root repo là do Next.js tự sinh; đặt
`agentRules: false` trong `next.config.ts` để nó thôi sinh nữa.

## Phân quyền

- `ADMIN` — làm được mọi thứ, kể cả quản lý user
- `EDITOR` — composer, prompts, categories, tags

Mỗi prompt lưu `updatedById`, nên màn danh sách và màn edit hiện được ai sửa
cuối cùng.

## HTTP API

Một endpoint duy nhất, chỉ đọc, ghép prompt ở ngoài giao diện web — cho n8n,
Make, spreadsheet hay script shell:

```
GET /api/compose?key=<key>&category=<slug>&tags=<slug,slug>
```

Nó chạy đúng cùng `selectFragments` / `composePrompt` mà màn Composer dùng, nên
API và UI không thể lệch kết quả nhau. Key do ADMIN cấp và thu hồi ở màn **API
keys**; DB chỉ lưu bản băm SHA-256 nên key chỉ hiện một lần và không lấy lại
được.

**Tài liệu đầy đủ cho người tích hợp: [docs/API.md](docs/API.md)** — từng tham
số, response body thật, bảng mã lỗi, ví dụ n8n / Sheets / shell, và những điều
cần biết về việc để key trong URL cùng chuyện không có rate limit.

## Deploy

Chạy trên server sandbox dưới pm2, phía trước là ALB terminate TLS.

| | |
| --- | --- |
| URL | `https://promptx.hbcommerce.co` (ALB → instance `:3310`) |
| Host | sandbox (`13.213.29.85`, private `172.31.30.171`) |
| Path | `/home/ec2-user/prompt-matrix` |
| Process | pm2 `prompt-matrix`, fork mode, `npm start` |
| Health | `/api/health` — ALB target group check đường này |
| Database | đi qua IP **private**, cùng VPC, traffic không ra internet |

Deploy bằng `/deploy prompt-matrix` qua skill deploy, câu lệnh nằm trong registry
của skill đó. Nó **build ở máy local rồi ship `.next` lên; server không build**.
Xem [Vì sao build bằng webpack](#vì-sao-build-bằng-webpack) — chính cái cờ đó
mới làm artifact build ở local chạy được trên server.

Server giữ `.env` riêng của nó (rsync loại trừ file này), với `SESSION_SECRET`
khác máy dev, nên session dev không dùng được trên production. Lần đầu deploy
lên một máy mới, cài dependency runtime một lần:

```bash
ssh <host> 'cd prompt-matrix && npm install --omit=dev --no-save'
```

Không dùng được `npm ci`: lockfile thiếu biến thể Linux của một optional
dependency gián tiếp thuộc `@tailwindcss/oxide` — thứ này chỉ dùng ở dev và
server chẳng cần, nhưng `npm ci` validate toàn bộ cây trước khi prune nên nó
vẫn fail.

Hai điều cần biết về môi trường này:

- **Sandbox dùng chung database với dev.** Sửa một prompt ở local là production
  đổi theo ngay; không có data staging.
- **Port 3310 vào thẳng được bằng public IP của instance, qua HTTP thuần.**
  Session cookie có cờ `Secure` nên đăng nhập đường đó **fail âm thầm** — form
  submit rồi quay về `/login` mà không báo lỗi gì. Siết 3310 cho chỉ nhận từ
  security group của ALB là hết bẫy.

## Vì sao build bằng webpack

`npm run build` truyền `--webpack`, ghi đè mặc định Turbopack. Bản build
production của Turbopack externalise `pg` và `@prisma/client` thành specifier
gắn hash nội dung — kiểu `pg-587764f78a6c7a9c` — và chúng **chỉ** resolve được
với đúng cây `node_modules` tồn tại lúc build. Luồng deploy build ở local rồi
ship `.next` sang server, nơi có cây prod-only riêng, nên trên đó những
specifier ấy không tồn tại và mọi route cần DB trả 500. Bản build webpack
require `pg` và `@prisma/client` bằng tên thường, resolve ở đâu cũng được.

Triệu chứng nếu ai đó gỡ cờ này: log pm2 đầy `Cannot find module 'pg-<hash>'`,
`/login` vẫn ổn, còn lại 500 hết.

## Import từ Lark Base

Kho playbook ticket CS nằm trong một Lark Base, kéo về bằng
`scripts/import-lark-tickets.ts`:

```bash
npx tsx scripts/import-lark-tickets.ts --dry-run   # chi bao cao, khong ghi
npx tsx scripts/import-lark-tickets.ts             # ghi that
```

Nguồn là bảng "Ticket AI Label" của base `MZ1NbE0H9acwOZsFfscj4SuSpuh`, đọc qua
`lark-cli` bằng bot identity. **Không ghi gì trở lại Lark.**

Mapping: `Case` thành title, `AI Label` thành tag duy nhất của prompt,
`Action tiếp theo` và `Template` ghép vào body dưới hai heading `Next action:`
và `Template:` — cái đầu là chỉ dẫn nội bộ, cái sau là câu trả lời gửi khách, mà
nối liền nhau thì đọc như thể chỉ dẫn cũng là một phần của câu trả lời. Dòng nào
rỗng cả hai thì lấy `Nội dung đầy đủ` làm body. Tất cả vào category `Ticket
Label` đã có.

Importer match theo (category, title), nên chạy lại sau khi Base thay đổi là nó
update body và tag chứ không sinh row trùng. Tag nào Base nhắc tới mà DB chưa có
thì nó tạo.

Lưu ý: `lark-cli` không expose page token, nên importer đọc đúng một trang 200
dòng và **fail rõ ràng** nếu bảng đã vượt số đó.

## Những chỗ đáng đọc trong code

- `src/lib/compose.ts` — chọn mảnh và ghép chúng lại. Pure function.
- `src/components/Masonry.tsx` — đo chiều cao card thật rồi nhồi vào cột ngắn
  nhất, nhờ vậy thứ tự đọc vẫn gần với row-major. CSS `columns` xếp theo từng
  cột nên sẽ làm thứ tự đó lộn xộn.
- `src/lib/graph.ts` — biến danh sách prompt thành node và edge của graph. Pure
  function.
- `src/app/(app)/manage/prompts/PromptGraph.tsx` — phần simulation. Vị trí node
  ghi trực tiếp vào DOM mỗi tick chứ không qua React state; đây chính là thứ giữ
  cho vài trăm node vẫn 60fps.
- `src/lib/api-key.ts` — sinh key và băm key.
- `src/proxy.ts` — lớp chặn session. Lưu ý `/api` **nằm ngoài** matcher của nó,
  nên bất kỳ route nào thêm dưới `/api` đều phải tự xác thực.

## Giới hạn đã biết

- Màn danh sách prompt chỉ hiện 200 kết quả đầu; siết filter lại để thấy phần
  còn lại.
- Graph vẽ bằng SVG và chặn ở 500 node prompt, vượt thì **báo rõ trên màn hình**
  chứ không cắt lén. Muốn hơn nữa thì phải chuyển sang canvas và tự hit-test.
- Category không có prompt nào trong filter hiện tại thì bị bỏ khỏi graph: một
  node cô lập không mang thông tin gì.
- API **không có rate limit**, và key **không có scope hay hạn dùng**: key nào
  cũng đọc được mọi category. Đây là quyết định có chủ ý cho tool nội bộ — xem
  [docs/API.md](docs/API.md).
- Session là JWT stateless, nên vô hiệu hoá một user **không** đá session đang
  mở ra ngay; phải chờ token hết hạn (7 ngày).
- Một prompt chỉ thuộc đúng một category. Ghép prompt xuyên nhiều category cùng
  lúc thì chưa làm.
