# Coding Standard

Quy chuẩn code cho dự án NestJS tutorial. Đúc kết từ các review comment của mentor trên PR#3.

---

## 1. Module Boundary — Single Responsibility

Mỗi module chỉ chịu trách nhiệm cho **một domain**. Không gộp nhiều nghiệp vụ khác nhau vào chung một module.

| Module | Trách nhiệm | KHÔNG chứa |
|---|---|---|
| `users` | CRUD thông tin user, cập nhật avatar | Logic follow/unfollow, logic public profile |
| `follows` | Quan hệ follow/unfollow giữa 2 user | Thông tin user, response DTO cho profile |
| `profiles` | Ghép user + follow-status để trả về public profile | Truy vấn DB trực tiếp (phải gọi qua `UsersService`/`FollowsService`) |
| `attachments` | Lưu trữ & phục vụ file upload (avatar, ...) | Business logic của module sở hữu file (user, post, ...) |
| `auth` | Đăng ký, đăng nhập, JWT, blacklist token | Thông tin profile user |

**Vì sao:** gộp chung khiến module phình to, khó test độc lập, và một thay đổi ở follow có thể vô tình ảnh hưởng user. Tách riêng giúp mỗi module có thể export đúng những gì module khác cần qua `exports` của `@Module`.

**Áp dụng:** khi thêm tính năng mới, tự hỏi "cái này thuộc domain nào?" trước khi thêm code vào module có sẵn. Nếu không khớp domain nào, tạo module mới.

---

## 2. Folder Structure trong một Module

Nguyên tắc: **file nào một-module-một-cái** (controller, service, module) thì để phẳng ngay ở root module — tên file đã có hậu tố `.controller.ts`/`.service.ts` nên không cần bọc thêm folder. **File nào một module có thể có nhiều cái** (DTO, entity, guard, constant, interface...) thì mới tách subfolder theo vai trò.

```
src/modules/{feature}/
├── {feature}.controller.ts    # Route handler(s) — chỉ định tuyến. Nếu module có nhiều controller (vd: public + admin), đặt tên phân biệt rõ, KHÔNG cần bọc folder controllers/ cho 1-2 file.
├── {feature}.service.ts       # Business logic, transaction, xử lý lỗi
├── {feature}.module.ts
├── {feature}.service.spec.ts  # Unit test đặt cạnh file được test
├── entities/                  # TypeORM entity (DB model) — thường có thể phát sinh nhiều entity/module
├── dto/                       # Request/response DTOs — luôn có nhiều hơn 1 file
├── guards/                    # Auth guards riêng của module (nếu có)
├── strategies/                # Passport strategies (nếu có)
├── interceptors/              # Interceptor factory (vd: FileInterceptor config)
├── constants/                 # Hằng số của module (UPPER_SNAKE_CASE)
└── interfaces/                # Type/interface dùng chung trong module
```

Ví dụ thực tế trong repo:

```
src/modules/users/
├── users.controller.ts
├── users.service.ts
├── users.service.spec.ts
├── users.module.ts
├── entities/user.entity.ts
├── dto/update-user.dto.ts
├── dto/user-response.dto.ts
├── constants/users.constants.ts
├── interceptors/avatar-upload.interceptor.ts
└── interfaces/avatar-file.interface.ts

src/modules/follows/
├── follows.service.ts
├── follows.service.spec.ts
├── follows.module.ts
└── entities/follow.entity.ts

src/modules/profiles/
├── profiles.controller.ts
├── profiles.service.ts
├── profiles.module.ts
└── dto/profile-response.dto.ts
```

**Vì sao:** bọc `controllers/`/`services/` quanh đúng 1 file/module không thêm giá trị tra cứu — tên file `.controller.ts`/`.service.ts` đã tự nói vai trò, còn thêm 1 cấp thư mục chỉ làm sâu path không cần thiết. Ngược lại, `dto/`, `entities/`... thực sự có nhiều file nên tách riêng mới giúp tìm nhanh.

**Áp dụng:** mặc định để `{feature}.controller.ts`, `{feature}.service.ts`, `{feature}.module.ts` phẳng ở root. Chỉ tạo `controllers/`/`services/` subfolder khi module **thật sự** có từ 2 controller hoặc 2 service trở lên (vd: cần tách controller public và controller admin).

---

## 3. Controller — Chỉ là tầng định tuyến

**Rule:** Controller **không** chứa business logic, không tự query DB, không tự xử lý điều kiện nghiệp vụ. Controller chỉ nhận request, gọi đúng 1 hàm service, trả response.

**Vì sao:** Mentor review trực tiếp: *"Ở controller mình làm tầng định tuyến, nên chỉ gọi lại hàm xử lý ở service thôi chứ không xử lý nhiều."*

**Sai (logic nằm trong controller):**
```typescript
@Get(':username')
async getProfile(@Param('username') username: string, @CurrentUser() currentUser: User | null) {
  const profileUser = await this.usersService.findByUsername(username);
  if (!profileUser) throw new NotFoundException(...);
  const following = currentUser
    ? await this.followsService.isFollowing(currentUser.id, profileUser.id)
    : false;
  return ProfileResponseDto.fromEntity(profileUser, following);
}
```

**Đúng (controller mỏng, service xử lý hết):**
```typescript
@Get(':username')
async getProfile(@Param('username') username: string, @CurrentUser() currentUser: User | null) {
  return this.profilesService.getProfile(username, currentUser?.id);
}
```

---

## 4. Type Extraction — Không dùng inline union type

**Rule:** Khi một type lặp lại ở nhiều chỗ (function signature, DTO field...), tách ra `interface`/`type` riêng trong `interfaces/`.

**Vì sao:** Mentor review: *"em tạo 1 type riêng cho gọn nhé"* — inline object type lặp lại ở controller, service khiến code dài dòng, khó đồng bộ khi sửa.

**Sai:**
```typescript
async updateWithAvatar(
  userId: string,
  data: Partial<{ username: string; email: string; password: string; bio: string; image: string }>,
  avatar?: { originalname: string; mimetype: string; size: number; buffer: Buffer },
): Promise<User> { ... }
```

**Đúng:**
```typescript
// interfaces/avatar-file.interface.ts
export interface AvatarFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

// interfaces/update-user-data.interface.ts
export interface UpdateUserData {
  username?: string;
  email?: string;
  password?: string;
  bio?: string;
  image?: string;
}
```

---

## 5. Extract cấu hình lặp lại thành hàm riêng

**Rule:** Khi một khối option (interceptor config, validation rule...) dài và có thể tái sử dụng, tách thành hàm/factory riêng rồi gọi lại.

**Vì sao:** Mentor review: *"Các option này, em tạo 1 hàm riêng rồi call thôi cho gọn nha."*

**Sai (khai báo inline trong decorator):**
```typescript
@UseInterceptors(
  FileInterceptor('avatar', {
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype)) {
        callback(new BadRequestException(...), false);
        return;
      }
      callback(null, true);
    },
  }),
)
```

**Đúng (tách factory function):**
```typescript
// constants/users.constants.ts
export const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_AVATAR_SIZE = 10 * 1024 * 1024;

// helpers/avatar-interceptor.helper.ts
export function createAvatarInterceptor() {
  return FileInterceptor('avatar', {
    limits: { fileSize: MAX_AVATAR_SIZE },
    fileFilter: (_req, file, callback) => {
      if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype)) {
        callback(new BadRequestException(`Avatar must be one of: ${ALLOWED_AVATAR_MIME_TYPES.join(', ')}`), false);
        return;
      }
      callback(null, true);
    },
  });
}

// controller
@UseInterceptors(createAvatarInterceptor())
```

---

## 6. Transaction — Toàn vẹn dữ liệu khi thao tác nhiều bảng

**Rule:** Khi một nghiệp vụ ghi vào nhiều bảng (vd: xóa attachment cũ + lưu attachment mới + update user), phải bọc trong transaction. Nếu bước nào lỗi, toàn bộ rollback.

**Vì sao:** Mentor review: *"Chỗ này em dùng transaction để toàn vẹn dữ liệu trong trường hợp fails."*

**CẢNH BÁO — lỗi dễ mắc nhất khi dùng `dataSource.transaction()`:** `dataSource.transaction(async (manager) => {...})` chỉ tạo ra 1 connection/transaction *có sẵn* trong tham số `manager` của callback. Nếu code bên trong callback gọi service khác mà service đó dùng `Repository` inject qua `@InjectRepository` (connection mặc định) thay vì `manager` được truyền vào, thì các câu lệnh đó **chạy ngoài transaction, tự commit ngay lập tức** — `transaction()` lúc này chỉ là cái vỏ rỗng, không rollback được gì. Đây là lỗi từng thực sự xảy ra trong repo này (`updateWithAvatar` gọi `attachmentsService.saveFile`/`deleteAllForOwner` không truyền `manager`) và bị 10 agent review độc lập phát hiện cùng lúc.

**Sai (transaction rỗng — nhìn giống đúng nhưng không atomic):**
```typescript
async updateWithAvatar(userId: string, dto: UpdateUserDto, avatar?: Express.Multer.File): Promise<User> {
  const data = await this.buildUpdateData(dto);
  return this.dataSource.transaction(async () => {          // (manager) không được khai báo/dùng
    if (avatar) {
      await this.attachmentsService.deleteAllForOwner(AttachmentOwnerType.USER_AVATAR, userId); // chạy trên connection mặc định
      const attachment = await this.attachmentsService.saveFile(AttachmentOwnerType.USER_AVATAR, userId, avatar); // tự commit ngay
      data.image = `/attachments/${attachment.id}`;
    }
    return this.updateById(userId, data); // usersRepository cũng dùng connection mặc định — không rollback được
  });
}
```
Nếu `updateById` fail (vd trùng username) sau khi avatar đã đổi: file/row avatar mới đã **commit thật**, avatar cũ đã bị xóa thật — không gì rollback lại được, dù code "trông có transaction".

**Đúng (truyền `manager` xuyên suốt mọi Repository call bên trong transaction):**
```typescript
// users.service.ts
async updateWithAvatar(userId: string, dto: UpdateUserDto, avatar?: Express.Multer.File): Promise<User> {
  const data = await this.buildUpdateData(dto);
  return this.dataSource.transaction(async (manager) => {   // lấy đúng EntityManager của transaction
    if (avatar) {
      await this.attachmentsService.deleteAllForOwner(AttachmentOwnerType.USER_AVATAR, userId, manager);
      const attachment = await this.attachmentsService.saveFile(AttachmentOwnerType.USER_AVATAR, userId, avatar, manager);
      data.image = `/attachments/${attachment.id}`;
    }
    return this.updateById(userId, data, manager);           // truyền tiếp xuống updateById
  });
}

async updateById(id: string, data: UpdateUserData, manager?: EntityManager): Promise<User> {
  const repository = manager ? manager.getRepository(User) : this.usersRepository;
  // ... dùng `repository` thay vì `this.usersRepository` từ đây trở xuống
}
```
```typescript
// attachments.service.ts — method của service khác được gọi bên trong transaction cũng phải nhận & dùng manager
async saveFile(ownerType: AttachmentOwnerType, ownerId: string, file: Express.Multer.File, manager?: EntityManager): Promise<Attachment> {
  const repository = manager ? manager.getRepository(Attachment) : this.attachmentsRepository;
  // ...
}
```

**Áp dụng:** bất kỳ method nào có thể được gọi *bên trong* một `dataSource.transaction()` của service khác đều phải nhận thêm tham số `manager?: EntityManager` tuỳ chọn, và tự chọn `manager.getRepository(Entity)` thay vì Repository đã inject khi `manager` được truyền vào. Test phải mock `DataSource.transaction` trả về một `manager` giả có `getRepository` (không phải `undefined`), và assert rằng `manager` đó thực sự được truyền xuống các service con — nếu không, test vẫn xanh dù transaction bị rỗng như ví dụ Sai ở trên (xem `users.service.spec.ts`, test `updateWithAvatar` và `test/users.e2e-spec.ts` test *"rolls back the avatar swap when the rest of the update fails"* — test e2e này insert thật vào Postgres và assert đúng row nào sống sót sau rollback, phát hiện được lỗi mà test unit mock không thể).

**Lưu ý theo mentor:** xóa row attachment trong DB là bắt buộc trong transaction; xóa **file vật lý trên đĩa có thể để lại**, dọn dẹp sau bằng cron job hàng tháng — không cần chặn transaction chính vì thao tác I/O đĩa không rollback được (transaction DB chỉ bảo vệ được các bảng, không bảo vệ được filesystem).

---

## 7. Error Handling — Bắt lỗi cụ thể, trả message rõ ràng

**Rule:**
- Luôn guard trường hợp input rỗng trước khi gọi TypeORM update (`Object.keys(data).length === 0`).
- Bắt `QueryFailedError` mã `23505` (unique violation) → convert thành `ConflictException` với message theo đúng constraint bị vi phạm (phân biệt username/email).
- Race condition (double-click follow) → dựa vào DB constraint bắt lỗi, không chỉ dựa vào check-then-act.

```typescript
async updateById(id: string, data: Partial<UpdateUserData>): Promise<User> {
  if (Object.keys(data).length === 0) {
    return (await this.findById(id))!;
  }
  try {
    await this.usersRepository.update(id, data);
  } catch (error) {
    throw this.toConflictOrRethrow(error);
  }
  const user = await this.findById(id);
  if (!user) throw new NotFoundException(this.i18n.t('errors.userNotFound'));
  return user;
}

private toConflictOrRethrow(error: unknown): unknown {
  if (!(error instanceof QueryFailedError) || (error.driverError as { code?: string })?.code !== POSTGRES_UNIQUE_VIOLATION) {
    return error;
  }
  const constraint = (error.driverError as { constraint?: string })?.constraint;
  if (constraint === 'UQ_users_username') return new ConflictException(this.i18n.t('errors.usernameAlreadyTaken'));
  if (constraint === 'UQ_users_email') return new ConflictException(this.i18n.t('errors.emailAlreadyRegistered'));
  return new ConflictException(this.i18n.t('errors.usernameOrEmailAlreadyRegistered'));
}
```

---

## 8. Upload File — Luôn validate MIME type

**Rule:** `FileInterceptor` phải có `fileFilter` với allow-list MIME type rõ ràng, không chỉ dựa vào `limits.fileSize`.

**Vì sao:** không validate MIME type mở ra lỗ hổng stored-content-type spoofing (upload `.html` giả làm avatar rồi server trả về đúng Content-Type gốc → XSS).

---

## 9. Response Envelope — Format thống nhất

**Rule:** Mọi response thành công phải bọc trong 1 object có key là tên resource số ít (`user`, `profile`); mọi lỗi trả về `{ errors: { body: string[] } }`. Không tự chế format khác trong controller/service.

**Vì sao:** API theo chuẩn RealWorld — client (frontend) parse cố định theo envelope này. Một module trả sai format sẽ vỡ hợp đồng API mà không lỗi compile-time.

**Response thành công — luôn qua static factory `fromEntity` của DTO:**
```typescript
// dto/user-response.dto.ts
export class UserResponseDto {
  user: { email: string; token: string; username: string; bio: string | null; image: string | null };

  static fromEntity(user: User, token: string): UserResponseDto {
    const dto = new UserResponseDto();
    dto.user = { email: user.email, token, username: user.username, bio: user.bio, image: user.image };
    return dto;
  }
}
// → { "user": { "email": "...", "token": "...", ... } }
```

```typescript
// dto/profile-response.dto.ts theo cùng pattern, key là "profile"
// → { "profile": { "username": "...", "bio": "...", "image": "...", "following": true } }
```

**Response lỗi — xử lý tập trung ở `HttpExceptionFilter`, controller/service KHÔNG tự build response lỗi:**
```typescript
// src/common/filters/http-exception.filter.ts — đã xử lý sẵn, chỉ cần throw đúng HttpException
throw new ConflictException(this.i18n.t('errors.usernameAlreadyTaken'));
// → filter tự convert thành { "errors": { "body": ["Username already taken"] } }
```

**Áp dụng:** khi tạo resource mới, luôn tạo `XxxResponseDto` với static `fromEntity()`, không trả entity thô hoặc object tự chế từ controller.

---

## 10. Chiều phụ thuộc giữa Module

**Rule:** Import giữa các module phải theo **một chiều duy nhất**, không được vòng (circular). Chiều phụ thuộc hiện tại:

```
auth ──depends on──▶ users
profiles ──depends on──▶ users, follows
follows ──depends on──▶ users (chỉ entity, qua TypeORM relation)
attachments ◀── không phụ thuộc module nào khác (module lá)
```

**Rule cụ thể:**
- Module ở lớp dưới (`users`, `attachments`) **không được import** từ module ở lớp trên (`profiles`, `auth`).
- Muốn dùng logic của module khác → import qua `exports` của `XxxModule`, không import thẳng file service/controller của module chưa export nó (kiểm tra `exports: [...]` trong `XxxModule` trước khi import).
- Nếu 2 module cần dữ liệu của nhau (A cần B, B cần A) → dấu hiệu cần tách thêm 1 module thứ 3 chứa phần dùng chung, không phá lệ để import vòng.

**Vì sao:** import vòng giữa module gây lỗi khởi tạo DI khó debug (`Nest can't resolve dependencies`), và làm mất khả năng test module độc lập.

**Áp dụng:** trước khi thêm import cross-module, kiểm tra ngược lại xem module đích có import lại module nguồn không. Nếu có, dừng lại và tách logic dùng chung ra module riêng.

---

## 11. Testing Convention

**Rule:**
- Unit test (`*.spec.ts`) đặt cạnh file được test, cùng thư mục (vd: `users.service.spec.ts` cạnh `users.service.ts` ở root module).
- Mock tất cả dependency ở boundary của service đang test (Repository, `I18nService`, service của module khác) — **không mock chính class đang test**.
- Không cần DB thật cho unit test — dùng `getRepositoryToken` + mock object cho `Repository`.
- Test tối thiểu phải phủ: happy path, lỗi validate (unique violation → đúng exception), race condition nếu có (follow trùng), trường hợp rỗng/null.
- Không viết test cho code chỉ gọi lại thư viện (vd: không cần test lại chính TypeORM).

**Vì sao:** giữ test nhanh, độc lập, không phụ thuộc DB/network khi chạy CI.

**Áp dụng:** khi thêm method mới vào service có xử lý lỗi/điều kiện nghiệp vụ, bắt buộc thêm test case tương ứng trước khi coi PR hoàn thành.

**E2E test (`test/*.e2e-spec.ts`):**
- Bắt buộc thêm e2e cho một flow khi thoả **một trong hai** điều kiện: (1) flow đi xuyên ≥2 module (vd: register ở `auth` → dùng ở `users`/`profiles`), hoặc (2) flow phụ thuộc hành vi DB thật mà unit test mock `Repository` không kiểm chứng được (unique constraint, transaction rollback).
- Dùng DB/Redis thật qua docker-compose (`test/utils/create-test-app.ts` boot cả `AppModule`), không mock — mục đích của e2e là xác nhận toàn bộ pipeline (guard, pipe, filter, DB constraint) hoạt động đúng với nhau, khác với unit test.
- Dùng chung `createTestApp()` và `registerUser()` trong `test/utils/` cho mọi file e2e, không copy lại logic bootstrap/tạo user ở từng file (xem mục 5 — extract cấu hình lặp lại).
- Hiện có: `test/auth.e2e-spec.ts` (register/login/logout/blacklist), `test/users.e2e-spec.ts` (update profile, avatar upload + mime validation), `test/follow.e2e-spec.ts` (follow/unfollow xuyên `profiles`+`follows`+`users`).

---

## 12. Naming Conventions

| Đối tượng | Quy tắc | Ví dụ |
|---|---|---|
| Function/method | camelCase, verb hoặc verb-noun | `saveFile`, `deleteAllForOwner`, `isFollowing` |
| Constant | UPPER_SNAKE_CASE | `SALT_ROUNDS`, `ALLOWED_AVATAR_MIME_TYPES` |
| Class | PascalCase | `UsersService`, `ProfileResponseDto` |
| Interface | PascalCase | `AvatarFile`, `UpdateUserData` |
| Boolean method/field | bắt đầu bằng `is`/`has`/`should` | `isFollowing`, `hasAvatar` |
| File | kebab-case + hậu tố vai trò | `users.controller.ts`, `follow.entity.ts`, `update-user.dto.ts` |

---

## 13. Comment

- Mặc định **không viết comment**.
- Chỉ viết khi giải thích **WHY** (constraint ẩn, workaround, invariant không rõ ràng) — không giải thích **WHAT** vì tên biến/hàm đã tự nói.
- Không tham chiếu ticket/PR/issue trong comment.

---

## 14. Ngoại lệ đã biết với Sunlint (heuristic engine)

Sunlint là **heuristic**, một số cảnh báo không phản ánh đúng thực tế kiến trúc. Các ngoại lệ sau đã được xem xét và **chấp nhận có chủ đích**, không cần sửa mỗi lần gặp lại:

| Rule | Cảnh báo | Vì sao chấp nhận |
|---|---|---|
| `C033` | *"Service vừa dùng Repository vừa dùng DataSource — pattern không nhất quán"*, và *"method gọi trực tiếp `manager.getRepository()`"* | `UsersService`/`AttachmentsService` dùng `Repository` inject cho query đơn, và `manager.getRepository(Entity)` bên trong `dataSource.transaction()` khi cần ghi nhiều bảng atomic trong 1 transaction (xem mục 6). `manager.getRepository()` là cách chuẩn của TypeORM để lấy Repository *đúng transaction đang chạy* — không dùng nó thì transaction rỗng (bug thật đã xảy ra, xem mục 6). Không phải lỗi kiến trúc. |
| `C030` | *"Dùng custom error class thay vì throw Error thường"* trong `jwt.strategy.ts` | `throw new Error('JWT_SECRET is not configured')` xảy ra ở **thời điểm boot app** (constructor strategy), trước khi request pipeline và `HttpExceptionFilter` tồn tại — mục đích là crash sớm (fail-fast) nếu thiếu env, không phải response trả về client. |
| `S037`, `S041`, `S045`, `S025` (một số vị trí) | Thiếu anti-cache header / brute-force protection / v.v. | Đã note trong PR#3: *"style/logging suggestions, not required to fix"* — đây là gợi ý bảo mật tổng quát cho tương lai (rate limiting, cache header), không phải lỗi chặn merge của pull hiện tại. Cân nhắc làm ở pull riêng về hardening. |

**Rule khi thêm ngoại lệ mới:** không tự ý bỏ qua warning — phải ghi lý do cụ thể vào bảng này khi quyết định "chấp nhận, không sửa", để review sau còn biết đây là quyết định có chủ đích chứ không phải bỏ sót.

---

## 15. Ưu tiên tái sử dụng của thư viện/codebase — hạn chế tự tạo lại

**Rule:** Trước khi tự định nghĩa type/interface/constant mới, kiểm tra xem (1) framework/thư viện đang dùng (NestJS, Express, Multer, TypeORM, class-validator...) đã có sẵn chưa, và (2) chính codebase đã có DTO/interface/class nào mô tả đúng shape đó chưa. Chỉ tự tạo mới khi cả hai đều không có ("thiếu mới tạo mới").

**Vì sao:** tự định nghĩa lại một type/constant đã có sẵn tạo ra nhiều nguồn sự thật (source of truth) cho cùng một khái niệm — thư viện hoặc DTO gốc đổi shape thì bản tự chế không tự động cập nhật theo, lệch nhau âm thầm mà compiler không báo được vì cả hai đều là type hợp lệ riêng biệt.

**Ví dụ đã sửa trong repo:**

| Trước (tự tạo, dư thừa) | Sau (tái sử dụng) | Lý do |
|---|---|---|
| `interface AvatarFile { originalname; mimetype; size; buffer }` tự viết trong `users/interfaces/`, và một object type inline y hệt trong `attachments.service.ts` | `Express.Multer.File` (từ `@types/multer`, đã sẵn trong devDependencies) | Multer đã định nghĩa đúng type file upload; tự viết lại vừa dư thừa vừa thiếu field so với thật (`fieldname`, `encoding`, `stream`...) — lỡ dùng field đó ở đâu là lộ ra sai lệch. |
| `@HttpCode(200)`, `@HttpCode(204)` (số ma thuật) | `@HttpCode(HttpStatus.OK)`, `@HttpCode(HttpStatus.NO_CONTENT)` | `HttpStatus` enum có sẵn trong `@nestjs/common` — đọc rõ nghĩa hơn số thuần, tránh gõ nhầm mã trạng thái. |
| `res.setHeader('Content-Type', ...)` + `res.sendFile()` qua `@Res()` thô trong `AttachmentsController` | `StreamableFile` (built-in Nest) với option `type` | Nest đã có sẵn kiểu trả về cho file streaming, tự quản lý response lifecycle (exception filter/interceptor vẫn hoạt động), không cần thoát ra `@Res()` không kiểm soát. |
| Interface `UserEnvelope`/`ProfileEnvelope` tự khai trong `test/utils/` chỉ để ép kiểu `res.body` | Import thẳng `UserResponseDto`/`ProfileResponseDto` từ `src/modules/.../dto/` | DTO thật đã tồn tại trong `src` — khai lại một interface song song chỉ để test là duplicate; DTO đổi field mà quên sửa test thì test vẫn "xanh" giả. |
| `const SALT_ROUNDS = 10` khai riêng trong `auth.service.ts`, trùng với `SALT_ROUNDS` đã export ở `users/constants/users.constants.ts` | Import `SALT_ROUNDS` từ `users.constants.ts` | 2 module cùng hash password nhưng dùng 2 hằng số độc lập — đổi cost factor ở 1 chỗ, chỗ kia âm thầm lệch, không compile error nào báo. |
| `POSTGRES_UNIQUE_VIOLATION = '23505'` + logic map lỗi unique-violation khai riêng ở cả `users.service.ts` và `follows.service.ts` | `src/common/utils/postgres-unique-violation.util.ts` export `isUniqueViolation()`/`getViolatedConstraint()`, cả 2 service cùng import | Cùng 1 khái niệm ("đây có phải lỗi trùng khoá không") bị cài đặt lại y hệt ở 2 nơi — sửa 1 chỗ (vd đổi driver DB, thêm constraint mới) rất dễ quên chỗ còn lại. |
| `expiresIn: Number(config.get('JWT_EXPIRES_IN')) \|\| 86400` và `process.env.PORT ?? 3000` tự default lại giá trị mà `Joi` schema (`env.validation.ts`) đã default sẵn | `config.getOrThrow<number>('JWT_EXPIRES_IN')`, `configService.getOrThrow<number>('PORT')` | Joi là nguồn sự thật duy nhất cho default/validate env var; tự default thêm lần 2 vừa dư thừa vừa có bug thật (`value \|\| default` biến `0` hợp lệ thành default sai) khi giá trị đúng lại là falsy. |

**Áp dụng:** trước khi viết `interface`/`type`/`const` mới, tự hỏi theo đúng thứ tự: thư viện đang dùng có sẵn chưa → codebase đã có DTO/interface nào mô tả đúng shape này chưa → chỉ khi cả hai đều không có mới tự định nghĩa. Với biến môi trường: nếu đã khai trong `envValidationSchema` (Joi), luôn đọc qua `ConfigService.getOrThrow()` — không đọc thẳng `process.env` và không tự default thêm lần 2.

---

## 16. Guard — Optional Auth phải fail-closed với lỗi thật, chỉ fail-open khi không có credential

**Rule:** Guard override `handleRequest(err, user, info)` cho route auth-optional (vd `OptionalJwtAuthGuard`) chỉ được coi là "anonymous" (trả `null`, không chặn request) khi **không có lỗi** (`err` rỗng — nghĩa là chỉ đơn giản không gửi token). Nếu `err` có giá trị (token sai định dạng do chính `validate()` throw, token bị revoke/blacklist, user trong token đã bị xoá...) thì phải rethrow, không được nuốt.

**Vì sao:** Bug thật đã xảy ra trong repo — `OptionalJwtAuthGuard.handleRequest(_err, user)` bỏ qua hẳn tham số lỗi và `return user || null`. Hậu quả: user vừa logout (token đã bị `RedisService` blacklist) gọi `GET /profiles/:username` (route auth-optional) — `JwtStrategy.validate()` throw `UnauthorizedException('tokenRevoked')` đúng như thiết kế, nhưng guard nuốt mất lỗi này và coi request là anonymous — trả về 200 thay vì báo token đã bị revoke. Cùng lỗi này cũng che giấu luôn trường hợp hạ tầng thật sự hỏng (Redis down khi check blacklist ném lỗi không mong muốn) thành "chỉ là chưa đăng nhập".

**Sai:**
```typescript
handleRequest<TUser = unknown>(_err: unknown, user: TUser | false): TUser | null {
  return user || null;   // nuốt mọi lỗi, kể cả lỗi thật
}
```

**Đúng:**
```typescript
handleRequest<TUser = unknown>(err: unknown, user: TUser | false): TUser | null {
  if (err) {
    throw err as Error;   // token sai/bị revoke → vẫn phải báo lỗi, không hạ xuống anonymous
  }
  return user || null;    // chỉ trường hợp không gửi token mới coi là anonymous
}
```

**Áp dụng:** mọi guard override `handleRequest` cho auth-optional phải có test riêng (`*.guard.spec.ts`) phủ đúng 3 case: không có token → `null`; có token hợp lệ → trả `user`; có token nhưng bị strategy từ chối (lỗi) → rethrow, không nuốt. Xem `src/modules/auth/guards/optional-jwt-auth.guard.spec.ts`.

---

## 17. Checklist trước khi tạo PR

- [ ] Controller không chứa business logic — chỉ gọi service.
- [ ] Mỗi module đúng 1 domain, không lẫn nghiệp vụ khác; không có import vòng giữa module (mục 10).
- [ ] `{feature}.controller.ts`/`.service.ts`/`.module.ts` phẳng ở root module; `dto/`, `entities/`, `guards/`, `constants/`, `interfaces/`... đúng subfolder theo vai trò (mục 2).
- [ ] Không còn inline object type lặp lại — đã tách `interface`.
- [ ] Không tự định nghĩa lại type/constant mà thư viện hoặc codebase đã có sẵn; env var đã có trong Joi schema thì đọc qua `ConfigService.getOrThrow()`, không tự default lại (mục 15).
- [ ] Có transaction cho thao tác ghi nhiều bảng — **và mọi Repository call bên trong callback thực sự dùng `manager` được truyền vào**, không phải Repository inject mặc định (mục 6). Nếu transaction gọi sang service khác, method đó phải nhận `manager?: EntityManager` và dùng nó.
- [ ] Guard input rỗng trước khi update DB.
- [ ] Bắt lỗi unique violation → trả `ConflictException` với message đúng field (dùng chung `isUniqueViolation()`/`getViolatedConstraint()` ở `common/utils`, không tự viết lại check `error.driverError.code`).
- [ ] Upload file có `fileFilter` allow-list MIME type.
- [ ] Guard auth-optional (override `handleRequest`) chỉ fail-open khi không có lỗi; có lỗi thật (token revoke, strategy throw...) phải rethrow (mục 16).
- [ ] Response thành công đi qua `XxxResponseDto.fromEntity()`, đúng envelope (mục 9).
- [ ] Có unit test cho happy path + lỗi validate + edge case rỗng/null (mục 11).
- [ ] Có e2e test nếu flow xuyên ≥2 module hoặc phụ thuộc DB constraint/transaction thật (mục 11).
- [ ] Chạy `npm run lint:sunlint` — 0 errors; warning mới phát sinh phải được review, warning đã biết xem mục 14.
- [ ] Chạy `npm run build`, `npm test`, và `npm run test:e2e` — cả 3 đều pass.
