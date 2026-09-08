# Prompt Matrix — HTTP API

Prompt Matrix giữ một kho **mảnh prompt** nhỏ. Mỗi mảnh thuộc một *category* và
mang một hoặc nhiều *tag*. Khi lọc theo category + tag, hệ thống ghép các mảnh
khớp điều kiện lại thành **một prompt hoàn chỉnh** để đưa cho AI.

API chỉ có **một endpoint duy nhất, chỉ đọc**, làm đúng việc đó ngoài giao diện
web — cho n8n, Make, Google Sheets hay một script shell.

Host: `https://promptx.hbcommerce.co`

> Endpoint này chạy đúng cùng một hàm ghép mà màn hình Composer đang dùng, nên
> kết quả API và kết quả trên web không bao giờ lệch nhau.

---

## 1. Xin API key

Key do **ADMIN** cấp trong app: menu **API keys** → nhập nhãn (ví dụ
`n8n workflow`) → **Create**.

Key có dạng `pm_<8 ký tự hex>_<48 ký tự hex>`, ví dụ:

```
pm_25242cb2_c8f1a0...
```

**Key chỉ hiện đúng một lần lúc tạo.** Hệ thống chỉ lưu bản băm SHA-256, không
lưu key gốc — mất thì không lấy lại được, phải revoke rồi tạo key mới.

Mỗi lần gọi API, hệ thống ghi lại thời điểm dùng cuối (`lastUsedAt`), hiện ngay
trên màn hình API keys. Đây là cách phát hiện key bị dùng bất thường.

Revoke có hiệu lực **ngay từ request kế tiếp**.

---

## 2. Endpoint

```
GET /api/compose
```

| Tham số    | Bắt buộc | Mặc định | Ý nghĩa |
| ---------- | -------- | -------- | ------- |
| `key`      | có¹      | —        | API key |
| `category` | **có**   | —        | slug của category, ví dụ `ticket-label` |
| `tags`     | không    | (rỗng)   | danh sách slug tag, cách nhau bằng dấu phẩy |
| `mode`     | không    | `OR`     | `OR` = mảnh có **bất kỳ** tag đã chọn · `AND` = mảnh phải có **đủ** tất cả tag |
| `format`   | không    | `json`   | `json` hoặc `text` |
| `titles`   | không    | `1`      | `1` = thêm dòng `## <tên mảnh>` phía trên mỗi mảnh · `0` = chỉ nội dung |

¹ Có thể gửi key bằng header thay vì query string:

```bash
curl -H "Authorization: Bearer pm_xxxxxxxx_..." \
  "https://promptx.hbcommerce.co/api/compose?category=ticket-label&tags=good-review"
```

### Cách chọn mảnh

- Mảnh được đánh dấu **base** luôn được lấy, bất kể chọn tag nào.
- Không chọn tag nào → **chỉ lấy mảnh base**.
- `mode=OR` → lấy mảnh có ít nhất một trong các tag đã chọn.
- `mode=AND` → chỉ lấy mảnh mang **đủ** tất cả tag đã chọn.
- Mảnh đang **tắt** (inactive) không bao giờ ra API.
- Thứ tự ghép theo `sortOrder`, rồi tới tên mảnh.

Lấy `category` slug và `tags` slug ở đâu: mở app, vào **Categories** / **Tags**,
slug hiện ngay cạnh tên (ví dụ `Ticket Label` → `ticket-label`).

---

## 3. Ví dụ

### Lấy JSON

```bash
curl "https://promptx.hbcommerce.co/api/compose\
?key=pm_xxxxxxxx_...\
&category=ticket-label\
&tags=good-review"
```

Kết quả thật (đã rút gọn phần `prompt` cho gọn):

```json
{
  "category": {
    "slug": "ticket-label",
    "name": "Ticket Label"
  },
  "mode": "OR",
  "tags": ["good-review"],
  "titles": true,
  "fragmentCount": 1,
  "fragments": [
    {
      "id": "cmtmxgpqz0037sk7wp409pjaj",
      "title": "Good review",
      "sortOrder": 900,
      "isBase": false,
      "tags": ["good-review"]
    }
  ],
  "prompt": "## Good review\nNext action:\nCảm ơn khách theo template...\n\nTemplate:\nThank you for sharing your kind words with us..."
}
```

Giải thích các field:

| Field           | Ý nghĩa |
| --------------- | ------- |
| `category`      | slug + tên category đã lọc |
| `mode`          | chế độ khớp tag đã dùng (`OR` / `AND`) |
| `tags`          | các tag slug đã gửi lên |
| `titles`        | request này có kèm tiêu đề `##` hay không |
| `fragmentCount` | số mảnh đã ghép |
| `fragments[]`   | danh sách mảnh đã dùng — hữu ích để kiểm tra vì sao prompt ra như vậy. **Không** chứa `body`; nội dung nằm trong `prompt` |
| `prompt`        | prompt hoàn chỉnh, đây là thứ đưa cho AI |

### Lấy plain text

Dùng khi tool chỉ cần đúng chuỗi prompt, không muốn parse JSON:

```bash
curl "https://promptx.hbcommerce.co/api/compose\
?key=pm_xxxxxxxx_...\
&category=ticket-label\
&tags=good-review\
&format=text"
```

```
## Good review
Next action:
Cảm ơn khách theo template. Điền AI Label: Post-purchase inquiry, set Resolved...

Template:
Thank you for sharing your kind words with us...
```

Content-type là `text/plain; charset=utf-8`.

### Bỏ tiêu đề

```
&titles=0
```

Khi đó output chỉ còn phần nội dung, các mảnh cách nhau một dòng trống.

Tiêu đề `## <tên mảnh>` có mặc định vì khi một tag kéo về nhiều mảnh, tất cả đều
mở đầu bằng `Next action:` / `Template:` — không có tiêu đề thì AI đọc vào
không có căn cứ nào để hiểu đây là **nhiều tình huống riêng biệt**.

### Nhiều tag

```bash
# OR — mảnh nào có mug HOẶC upload-photo
"...&category=product&tags=mug,upload-photo"

# AND — mảnh phải có CẢ HAI tag
"...&category=product&tags=mug,upload-photo&mode=AND"
```

---

## 4. Mã lỗi

Lỗi luôn trả JSON dạng `{"error": "..."}`.

| HTTP | Message | Nguyên nhân |
| ---- | ------- | ----------- |
| `401` | `Missing API key` | không gửi `key` và cũng không có header `Authorization` |
| `401` | `Invalid or revoked API key` | key sai, hoặc đã bị revoke |
| `400` | `category is required` | thiếu `category` |
| `404` | `Category not found` | slug category không tồn tại |
| `400` | `mode must be OR or AND` | `mode` sai giá trị |
| `400` | `format must be json or text` | `format` sai giá trị |
| `400` | `titles must be 1, 0, true or false` | `titles` sai giá trị |

Tham số sai giá trị bị **từ chối thẳng**, không âm thầm hiểu thành mặc định —
để một lỗi gõ sai không lặng lẽ trả về prompt khác với ý người gọi.

Lưu ý: category tồn tại nhưng không có mảnh nào khớp thì **không phải lỗi** —
API trả `200` với `fragmentCount: 0` và `prompt` là chuỗi rỗng.

---

## 5. Tích hợp

### n8n — HTTP Request node

```
Method : GET
URL    : https://promptx.hbcommerce.co/api/compose
Query  : key       = pm_xxxxxxxx_...
         category  = ticket-label
         tags      = shipping-inquiry
Response format: JSON
```

Prompt nằm ở `{{ $json.prompt }}`.

Nếu muốn giấu key khỏi URL, bỏ query `key` và thêm header:
`Authorization: Bearer pm_xxxxxxxx_...`

### Google Sheets

```
=IMPORTDATA("https://promptx.hbcommerce.co/api/compose?key=pm_xxxxxxxx_...&category=ticket-label&tags=good-review&format=text")
```

`IMPORTDATA` không gửi được header nên buộc dùng `key` trong URL.

### Shell

```bash
PROMPT=$(curl -s -H "Authorization: Bearer $PROMPTX_KEY" \
  "https://promptx.hbcommerce.co/api/compose?category=ticket-label&tags=good-review&format=text")
```

---

## 6. Những điều cần biết trước khi dùng

**Key nằm trong URL sẽ bị ghi lại.** Access log của server, history của
browser, header `Referer`, log của mọi proxy trên đường đi — tất cả đều lưu URL
đầy đủ. Nơi nào gửi được header thì nên dùng `Authorization: Bearer`. Key nghi
bị lộ thì revoke ngay, không cần chờ bằng chứng.

**Không có rate limit.** Đây là quyết định có chủ ý vì app dùng nội bộ. Nghĩa
là một key bị lộ có thể đọc toàn bộ kho prompt với tốc độ tuỳ ý. `lastUsedAt`
trên màn hình API keys là dây bẫy duy nhất.

**Key không có phạm vi và không hết hạn.** Mọi key đọc được mọi category. Muốn
giới hạn thì phải sửa code, hiện chưa có.

**Prompt có thể rất dài.** Một tag gom nhiều mảnh thì prompt ghép ra rất lớn —
ví dụ tag `shipping-inquiry` hiện gom 16 mảnh, ra hơn 17.000 ký tự. Nên kiểm
`fragmentCount` và độ dài `prompt` trước khi đẩy vào model có giới hạn context.

**Endpoint này nằm ngoài lớp xác thực session của web.** Nó tự kiểm API key. Ai
biết URL + key là gọi được, không cần đăng nhập.
