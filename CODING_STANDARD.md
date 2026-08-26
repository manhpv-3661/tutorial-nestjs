# Coding Standard

Quy chuẩn code cho dự án NestJS tutorial. Đúc kết từ các review comment của mentor trên PR#3.

---

## 1. Module Boundary — Single Responsibility

Mỗi module chỉ chịu trách nhiệm cho **một domain**. Không gộp nhiều nghiệp vụ khác nhau vào chung một module.

| Module        | Trách nhiệm                                                     | KHÔNG chứa                                                           |
| ------------- | --------------------------------------------------------------- | -------------------------------------------------------------------- |
| `users`       | CRUD thông tin user, cập nhật avatar                            | Logic follow/unfollow, logic public profile                          |
| `follows`     | Quan hệ follow/unfollow giữa 2 user                             | Thông tin user, response DTO cho profile                             |
| `profiles`    | Ghép user + follow-status để trả về public profile              | Truy vấn DB trực tiếp (phải gọi qua `UsersService`/`FollowsService`) |
| `attachments` | Lưu trữ & phục vụ file upload (avatar, ...)                     | Business logic của module sở hữu file (user, post, ...)              |
| `auth`        | Đăng ký, đăng nhập, JWT, blacklist token                        | Thông tin profile user                                               |
| `articles`    | CRUD article, slug, tagList, feed, ghép author + favorite state | Quan hệ favorite thô (phải gọi qua `FavoritesService`)               |
| `favorites`   | Quan hệ favorite/unfavorite giữa 1 user và 1 article            | Thông tin article, response DTO                                      |
| `comments`    | CRUD comment trên 1 article, ghép author + follow state         | Truy vấn article trực tiếp (phải gọi qua `ArticlesService`)          |

**Vì sao:** gộp chung khiến module phình to, khó test độc lập, và một thay đổi ở follow có thể vô tình ảnh hưởng user. Tách riêng giúp mỗi module có thể export đúng những gì module khác cần qua `exports` của `@Module`.

**Áp dụng:** khi thêm tính năng mới, tự hỏi "cái này thuộc domain nào?" trước khi thêm code vào module có sẵn. Nếu không khớp domain nào, tạo module mới.

---

## 2. Folder Structure

### 2.1 Cấu trúc cấp `src/` — tầng base/core

```
src/
├── main.ts                 # Chỉ bootstrap: create app → configureApp() → Swagger → listen. Không khai business logic.
├── app.module.ts           # Root module: ConfigModule/TypeOrmModule/I18nModule + import các feature module
├── common/                 # Dùng chung, KHÔNG thuộc domain nào
│   ├── bootstrap/          # configure-app.ts — pipe/interceptor/filter toàn cục, dùng chung cho main.ts và e2e
│   ├── decorators/         # Param decorator dùng chung (vd: @CurrentUser)
│   ├── filters/            # Exception filter toàn cục (all-exceptions.filter.ts)
│   └── utils/              # Helper thuần, không state — hậu tố `.util.ts`
├── config/                 # env.validation.ts (Joi schema) + typeorm.config.ts (registerAs factory)
├── database/migrations/    # Migration TypeORM — KHÔNG dùng synchronize
├── i18n/{lang}/*.json      # File dịch (common/errors/validation), copy sang dist qua nest-cli assets
├── redis/                  # Infra module (@Global) — cung cấp RedisService cho toàn app
└── modules/{feature}/      # Feature module theo domain (mục 1)
```

**Rule:**

- `common/` là tầng **thấp nhất**: chỉ chứa thứ không thuộc domain nào. File helper thuần đặt hậu tố `.util.ts` cho đồng nhất (`extract-bearer-token.util.ts`, `postgres-unique-violation.util.ts`).
- Infra module (`redis/`) đặt ngay dưới `src/`, **không** nằm trong `modules/` — `modules/` chỉ dành cho domain nghiệp vụ. Vì mỗi vai trò trong infra module chỉ có đúng 1 file nên để phẳng (`redis.module.ts`, `redis.service.ts`, `redis.constants.ts`), đúng nguyên tắc "một-module-một-cái thì để phẳng" ở mục 2.2; khi nào phát sinh nhiều file constant mới tách `constants/`.
- `main.ts` không được tự khai pipe/filter/interceptor toàn cục — tất cả nằm trong `common/bootstrap/configure-app.ts` để e2e (`test/utils/create-test-app.ts`) boot app **giống production**. Khai ở `main.ts` thì e2e chạy thiếu pipe/filter đó và test xanh giả.

### 2.2 Cấu trúc trong một Module

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

**Vì sao:** Mentor review trực tiếp: _"Ở controller mình làm tầng định tuyến, nên chỉ gọi lại hàm xử lý ở service thôi chứ không xử lý nhiều."_

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

**Vì sao:** Mentor review: _"em tạo 1 type riêng cho gọn nhé"_ — inline object type lặp lại ở controller, service khiến code dài dòng, khó đồng bộ khi sửa.

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

**Vì sao:** Mentor review: _"Các option này, em tạo 1 hàm riêng rồi call thôi cho gọn nha."_

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

**Vì sao:** Mentor review: _"Chỗ này em dùng transaction để toàn vẹn dữ liệu trong trường hợp fails."_

**CẢNH BÁO — lỗi dễ mắc nhất khi dùng `dataSource.transaction()`:** `dataSource.transaction(async (manager) => {...})` chỉ tạo ra 1 connection/transaction _có sẵn_ trong tham số `manager` của callback. Nếu code bên trong callback gọi service khác mà service đó dùng `Repository` inject qua `@InjectRepository` (connection mặc định) thay vì `manager` được truyền vào, thì các câu lệnh đó **chạy ngoài transaction, tự commit ngay lập tức** — `transaction()` lúc này chỉ là cái vỏ rỗng, không rollback được gì. Đây là lỗi từng thực sự xảy ra trong repo này (`updateWithAvatar` gọi `attachmentsService.saveFile`/`deleteAllForOwner` không truyền `manager`) và bị 10 agent review độc lập phát hiện cùng lúc.

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

**Áp dụng:** bất kỳ method nào có thể được gọi _bên trong_ một `dataSource.transaction()` của service khác đều phải nhận thêm tham số `manager?: EntityManager` tuỳ chọn, và tự chọn `manager.getRepository(Entity)` thay vì Repository đã inject khi `manager` được truyền vào. Test phải mock `DataSource.transaction` trả về một `manager` giả có `getRepository` (không phải `undefined`), và assert rằng `manager` đó thực sự được truyền xuống các service con — nếu không, test vẫn xanh dù transaction bị rỗng như ví dụ Sai ở trên (xem `users.service.spec.ts`, test `updateWithAvatar` và `test/users.e2e-spec.ts` test _"rolls back the avatar swap when the rest of the update fails"_ — test e2e này insert thật vào Postgres và assert đúng row nào sống sót sau rollback, phát hiện được lỗi mà test unit mock không thể).

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
  user: {
    email: string;
    token: string;
    username: string;
    bio: string | null;
    image: string | null;
  };

  static fromEntity(user: User, token: string): UserResponseDto {
    const dto = new UserResponseDto();
    dto.user = {
      email: user.email,
      token,
      username: user.username,
      bio: user.bio,
      image: user.image,
    };
    return dto;
  }
}
// → { "user": { "email": "...", "token": "...", ... } }
```

```typescript
// dto/profile-response.dto.ts theo cùng pattern, key là "profile"
// → { "profile": { "username": "...", "bio": "...", "image": "...", "following": true } }
```

**Response lỗi — xử lý tập trung ở `AllExceptionsFilter`, controller/service KHÔNG tự build response lỗi:**

```typescript
// src/common/filters/all-exceptions.filter.ts — đã xử lý sẵn, chỉ cần throw đúng HttpException
throw new ConflictException(this.i18n.t('errors.usernameAlreadyTaken'));
// → filter tự convert thành { "errors": { "body": ["Username already taken"] } }
```

**Filter phải là catch-all (`@Catch()`), không chỉ `@Catch(HttpException)`.** Nếu chỉ bắt `HttpException`, mọi lỗi không phải HTTP (Redis down, `QueryFailedError` chưa được convert, TypeError...) sẽ rơi xuống filter mặc định của Nest và trả `{ "statusCode": 500, "message": "Internal server error" }` — **vỡ envelope** mà không có lỗi compile-time nào báo, đúng loại bug mà rule này sinh ra để chặn. Với lỗi không phải `HttpException`, filter log lại bằng `Logger` (để debug) nhưng chỉ trả message chung `Internal server error` cho client — không leak message gốc (có thể chứa connection string, query, secret).

**Áp dụng:** khi tạo resource mới, luôn tạo `XxxResponseDto` với static `fromEntity()`, không trả entity thô hoặc object tự chế từ controller.

---

## 10. Chiều phụ thuộc giữa Module

**Rule:** Import giữa các module phải theo **một chiều duy nhất**, không được vòng (circular). Chiều phụ thuộc hiện tại:

```
auth ──depends on──▶ users
profiles ──depends on──▶ users, follows
users ──depends on──▶ attachments
follows ──depends on──▶ users (chỉ entity, qua TypeORM relation)
articles ──depends on──▶ users, follows, favorites
favorites ──depends on──▶ users, articles (chỉ entity, qua TypeORM relation)
comments ──depends on──▶ articles, follows
attachments ◀── không phụ thuộc module nghiệp vụ nào khác (module lá)

redis (@Global) ──▶ không import module nghiệp vụ nào; được inject ở bất kỳ đâu, không cần import RedisModule
common/, config/ ◀── tầng thấp nhất: KHÔNG được import giá trị từ modules/
```

**Lưu ý về cặp `articles`/`favorites`:** giống `profiles`/`follows`, đây là 2 module phụ thuộc lẫn nhau ở 2 mức khác nhau nên KHÔNG phải import vòng: `FavoritesModule.imports` không có `ArticlesModule` — `favorite.entity.ts` chỉ import class `Article` để khai `@ManyToOne` (entity-level, không phải module-level). Chiều import module thật sự chỉ có một chiều: `ArticlesModule.imports` → `FavoritesModule` (để gọi `FavoritesService`).

**Rule cụ thể:**

- Module ở lớp dưới (`users`, `attachments`) **không được import** từ module ở lớp trên (`profiles`, `auth`).
- Muốn dùng logic của module khác → import qua `exports` của `XxxModule`, không import thẳng file service/controller của module chưa export nó (kiểm tra `exports: [...]` trong `XxxModule` trước khi import).
- Nếu 2 module cần dữ liệu của nhau (A cần B, B cần A) → dấu hiệu cần tách thêm 1 module thứ 3 chứa phần dùng chung, không phá lệ để import vòng.
- `common/` chỉ được phụ thuộc `modules/` ở **mức type**, bằng `import type` — không import giá trị (class, service, constant runtime). Ví dụ `common/decorators/current-user.decorator.ts` cần shape của `User`: `import type { User } from '../../modules/users/entities/user.entity'`. `import type` bị xoá hoàn toàn khi compile (kiểm chứng: `dist/common/decorators/current-user.decorator.js` không có `require` nào tới users) nên tầng thấp nhất vẫn không có runtime coupling ngược chiều. Import thường (không có `type`) sẽ tạo coupling thật và phải sửa.
- Không đặt decorator/util dùng chung vào một feature module chỉ vì "nó liên quan domain đó": `@CurrentUser` được cả `users`, `profiles`, `auth` dùng — chuyển nó vào `modules/auth/` sẽ khiến `users → auth` trong khi `auth → users` đã tồn tại, tức là **import vòng**. Thứ nhiều module cùng dùng thuộc `common/`.

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
- Hiện có: `test/auth.e2e-spec.ts` (register/login/logout/blacklist), `test/users.e2e-spec.ts` (update profile, avatar upload + mime validation), `test/follow.e2e-spec.ts` (follow/unfollow xuyên `profiles`+`follows`+`users`), `test/articles.e2e-spec.ts` (CRUD + tag/author/favorited filter + feed + favorite/unfavorite), `test/comments.e2e-spec.ts` (add/list/delete comment xuyên `comments`+`articles`+`follows`, author-only delete).

**E2E dùng database riêng, tự seed/truncate mỗi test case:**

- `.env.test` (khai commit trong repo, khác `.env` chỉ ở `DB_NAME=nestjs_tutorial_test`) — e2e **không bao giờ** chạy trên DB dev. Trước PR6, e2e chạy chung `.env`/DB dev nên mỗi lần chạy tích luỹ rác (697 user/102 article rác từng thấy trong DB dev khi audit lại) — tách DB riêng để triệt để.
- `test/utils/setup-env.ts` nạp `.env.test` qua `dotenv.config()` ở `setupFiles` (chạy **trước** khi `AppModule`/`ConfigModule.forRoot()` được import) — dotenv mặc định không override biến đã có sẵn trong `process.env`, nên trên CI (đã set `DB_NAME` thật ở job `env:`) file `.env.test` bị bỏ qua tự nhiên, không cần sửa `ci.yml`.
- `test/utils/db-reset.ts` (`truncateAllTables`) + `test/utils/seed-database.ts` (`seedDatabase`, 2 user cố định `seed_alice`/`seed_bob`) được gắn vào `beforeEach`/`afterEach` **toàn cục** qua `test/utils/reset-database.setup.ts` (khai ở `setupFilesAfterEnv`) — mọi file `*.e2e-spec.ts` tự động seed trước và truncate sau **mỗi** test case, không cần từng file tự gọi. `createTestApp()` lưu `DataSource` của app đang chạy vào biến module-scope (`getActiveDataSource()`) để hook toàn cục lấy được đúng connection.
- **Bắt buộc `--runInBand`** (`npm run test:e2e`) vì truncate là thao tác toàn DB — nếu Jest chạy nhiều file e2e song song (nhiều worker) trên cùng 1 DB test, file này truncate sẽ xoá luôn dữ liệu file kia đang test giữa chừng, gây flaky. Chạy tuần tự loại bỏ hoàn toàn rủi ro này.
- Migration cho DB test: `npm run migration:run:test` (dùng `data-source.test.ts`, đọc `.env.test`) — chạy 1 lần khi tạo DB test mới hoặc sau khi thêm migration mới, tương tự `migration:run` cho DB dev.
- Dữ liệu seed (`seed_alice`/`seed_bob`) dùng username/email cố định, tách biệt hẳn với `registerUser()` (luôn sinh `user_<uuid>` ngẫu nhiên) — test hiện tại không assert danh sách toàn bộ user/article nên seed không phá assertion nào, chỉ đảm bảo DB không rỗng trước mỗi test như yêu cầu.

**Coverage sâu (C2 — condition coverage) cho ít nhất 1 controller:** `comments` module (`CommentsController` + `CommentsService`) được chọn làm ví dụ — `test/comments.e2e-spec.ts` phủ cả 2 nhánh của mọi điều kiện đơn trong 2 file này (có/không token; article tồn tại/không; comment tồn tại/không; đúng/sai tác giả; viewer ẩn danh/đã đăng nhập; follow/không follow tác giả comment; body hợp lệ/rỗng).

Đo bằng `npm run test:e2e:cov` (config `collectCoverageFrom` trong `test/jest-e2e.json` giới hạn vào `src/modules/comments/**/*.ts`). Kết quả đo thực tế: `comments.service.ts` 97.14% statement / 100% function; `comments.controller.ts` 100% statement / 100% function. Branch coverage báo 75-77% ở cả 2 file, nhưng khi soi từng nhánh cụ thể (`coverage-e2e/coverage-final.json`, field `branchMap`+`b`):

- **`CommentsController`: toàn bộ nhánh "chưa phủ" nằm ở dòng `constructor(...)` và chữ ký method (`create`/`list`/`delete`)** — đây là code do TypeScript compiler tự sinh cho decorator metadata (`emitDecoratorMetadata`, cần cho Nest DI/reflection: `@Param`, `@Body`, `@CurrentUser`, `@Post`/`@Get`/`@Delete`...), không phải logic nghiệp vụ. Thân method của `CommentsController` hoàn toàn tuyến tính (gọi service → return), không có `if`/ternary nào — 0 nhánh nghiệp vụ thật để thiếu.
- **`CommentsService`: chỉ 1 nhánh nghiệp vụ thật chưa phủ** — `if (!comment)` trong `findByIdOrThrow` (dòng 46). Method này chỉ được gọi nội bộ từ `create()` ngay sau `save()` thành công nên luôn tìm thấy — nhánh `NotFoundException` không có đường gọi nào từ controller để chạm tới qua e2e. Đã test ở `comments.service.spec.ts` (unit, gọi thẳng `findByIdOrThrow('ghost')`). Mọi ternary/`if` nghiệp vụ khác (`toResponseDto`, `toListResponseDto`, `deleteByIdForArticle`) đều phủ cả 2 chiều qua e2e.

**Áp dụng:** khi đo C2 coverage cho 1 controller/service khác, luôn soi `branchMap`/`b` trong `coverage-final.json` thay vì chỉ đọc % tổng — % branch trên file có nhiều decorator luôn bị kéo thấp giả tạo bởi code compiler sinh ra, không phản ánh đúng coverage logic thật.

---

## 12. Naming Conventions

| Đối tượng            | Quy tắc                          | Ví dụ                                                           |
| -------------------- | -------------------------------- | --------------------------------------------------------------- |
| Function/method      | camelCase, verb hoặc verb-noun   | `saveFile`, `deleteAllForOwner`, `isFollowing`                  |
| Constant             | UPPER_SNAKE_CASE                 | `SALT_ROUNDS`, `ALLOWED_AVATAR_MIME_TYPES`                      |
| Class                | PascalCase                       | `UsersService`, `ProfileResponseDto`                            |
| Interface            | PascalCase                       | `AvatarFile`, `UpdateUserData`                                  |
| Boolean method/field | bắt đầu bằng `is`/`has`/`should` | `isFollowing`, `hasAvatar`                                      |
| File                 | kebab-case + hậu tố vai trò      | `users.controller.ts`, `follow.entity.ts`, `update-user.dto.ts` |

---

## 13. Comment

- Mặc định **không viết comment**.
- Chỉ viết khi giải thích **WHY** (constraint ẩn, workaround, invariant không rõ ràng) — không giải thích **WHAT** vì tên biến/hàm đã tự nói.
- Không tham chiếu ticket/PR/issue trong comment.

---

## 14. Ngoại lệ đã biết với Sunlint (heuristic engine)

Sunlint là **heuristic**, một số cảnh báo không phản ánh đúng thực tế kiến trúc. Các ngoại lệ sau đã được xem xét và **chấp nhận có chủ đích**, không cần sửa mỗi lần gặp lại:

| Rule                                           | Cảnh báo                                                                                                                                                                                                                  | Vì sao chấp nhận                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `C033`                                         | _"Service vừa dùng Repository vừa dùng DataSource — pattern không nhất quán"_, và _"method gọi trực tiếp `manager.getRepository()`"_                                                                                      | `UsersService`/`AttachmentsService` dùng `Repository` inject cho query đơn, và `manager.getRepository(Entity)` bên trong `dataSource.transaction()` khi cần ghi nhiều bảng atomic trong 1 transaction (xem mục 6). `manager.getRepository()` là cách chuẩn của TypeORM để lấy Repository _đúng transaction đang chạy_ — không dùng nó thì transaction rỗng (bug thật đã xảy ra, xem mục 6). Không phải lỗi kiến trúc.                                                                                                                                                                                                                                                                                                                          |
| `C030` (đã hết áp dụng)                        | _"Dùng custom error class thay vì throw Error thường"_ trong `jwt.strategy.ts`                                                                                                                                            | Cảnh báo này đã được xử lý thật, không phải bỏ qua: `throw new Error('JWT_SECRET is not configured')` đã bị xoá và thay bằng `config.getOrThrow<string>('JWT_SECRET')` (mục 17.3) — `ConfigService` tự throw ngay tại boot với đúng tên key nên không cần guard tay, và không còn `Error` thường nào trong strategy.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `C018`                                         | _"Error logging should use structured format / should explain what happened / should provide guidance"_ ở các block `catch` trong `users.service.ts`, `follows.service.ts`, `favorites.service.ts`, `articles.service.ts` | Các block này **rethrow chứ không log**: `catch (error) { throw this.toConflictOrRethrow(error) }` (hoặc `if (isUniqueViolation(error)) { throw new ConflictException(...) } throw error;`) chuyển lỗi unique-violation thành `ConflictException`, còn lỗi khác thì rethrow nguyên trạng (mục 7, mục 16 áp dụng tương tự cho `follows`/`favorites`/`articles`). Log ở đây là sai chỗ theo 2 lý do: (1) `ConflictException` là kết quả nghiệp vụ mong đợi (user follow/favorite trùng), không phải sự cố cần log; (2) lỗi thật sự bất thường đã được `AllExceptionsFilter` log tập trung một lần (mục 9) — log thêm ở service tạo log trùng, cùng 1 lỗi xuất hiện 2 dòng. Sunlint chỉ thấy từ khoá `catch` + `error` nên tưởng là điểm logging. |
| `C030` (rethrow biến lỗi gốc)                  | _"Use custom error classes instead of throwing variables"_ ở dòng `throw error;` trong `follows.service.ts`/`favorites.service.ts`                                                                                        | Đây **không phải** throw một biến string/object tuỳ tiện — `error` ở đây là chính exception đã bắt được từ `catch (error)`, được rethrow nguyên trạng khi nó **không phải** trường hợp unique-violation đang xử lý (xem mục 6, "Race Condition Prevention" trong `mentor_coding_convention`). Heuristic chỉ thấy cú pháp `throw <identifier>` nên hiểu nhầm là throw giá trị thô, không phân biệt được `identifier` đó đã là một `Error` instance hợp lệ từ catch clause hay chưa.                                                                                                                                                                                                                                                             |
| `S037`, `S041`, `S045`, `S025` (một số vị trí) | Thiếu anti-cache header / brute-force protection / v.v.                                                                                                                                                                   | Đã note trong PR#3: _"style/logging suggestions, not required to fix"_ — đây là gợi ý bảo mật tổng quát cho tương lai (rate limiting, cache header), không phải lỗi chặn merge của pull hiện tại. Cân nhắc làm ở pull riêng về hardening.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

**Rule khi thêm ngoại lệ mới:** không tự ý bỏ qua warning — phải ghi lý do cụ thể vào bảng này khi quyết định "chấp nhận, không sửa", để review sau còn biết đây là quyết định có chủ đích chứ không phải bỏ sót.

**Sunlint là gate CỤC BỘ, không phải gate CI.** `sunlint` được cài global (`@sun-asterisk/sunlint`), không có trong `devDependencies`, nên `npm ci` trên CI không có binary này — `ci.yml` **không** chạy được `lint:sunlint` và không nên thêm vào. Trách nhiệm chạy nằm ở người tạo PR (mục 19) kèm ảnh chụp kết quả. File `.sunlint-eslint.config.js` do sunlint tự sinh ra mỗi lần chạy, chứa **đường dẫn tuyệt đối theo máy** (`C:Users...`) nên đã được liệt trong `.gitignore`, `.prettierignore` và `ignores` của eslint — không commit, không format, không lint file này.

---

## 15. Ưu tiên tái sử dụng của thư viện/codebase — hạn chế tự tạo lại

**Rule:** Trước khi tự định nghĩa type/interface/constant mới, kiểm tra xem (1) framework/thư viện đang dùng (NestJS, Express, Multer, TypeORM, class-validator...) đã có sẵn chưa, và (2) chính codebase đã có DTO/interface/class nào mô tả đúng shape đó chưa. Chỉ tự tạo mới khi cả hai đều không có ("thiếu mới tạo mới").

**Vì sao:** tự định nghĩa lại một type/constant đã có sẵn tạo ra nhiều nguồn sự thật (source of truth) cho cùng một khái niệm — thư viện hoặc DTO gốc đổi shape thì bản tự chế không tự động cập nhật theo, lệch nhau âm thầm mà compiler không báo được vì cả hai đều là type hợp lệ riêng biệt.

**Ví dụ đã sửa trong repo:**

| Trước (tự tạo, dư thừa)                                                                                                                                                | Sau (tái sử dụng)                                                                                                                     | Lý do                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `interface AvatarFile { originalname; mimetype; size; buffer }` tự viết trong `users/interfaces/`, và một object type inline y hệt trong `attachments.service.ts`      | `Express.Multer.File` (từ `@types/multer`, đã sẵn trong devDependencies)                                                              | Multer đã định nghĩa đúng type file upload; tự viết lại vừa dư thừa vừa thiếu field so với thật (`fieldname`, `encoding`, `stream`...) — lỡ dùng field đó ở đâu là lộ ra sai lệch.                    |
| `@HttpCode(200)`, `@HttpCode(204)` (số ma thuật)                                                                                                                       | `@HttpCode(HttpStatus.OK)`, `@HttpCode(HttpStatus.NO_CONTENT)`                                                                        | `HttpStatus` enum có sẵn trong `@nestjs/common` — đọc rõ nghĩa hơn số thuần, tránh gõ nhầm mã trạng thái.                                                                                             |
| `res.setHeader('Content-Type', ...)` + `res.sendFile()` qua `@Res()` thô trong `AttachmentsController`                                                                 | `StreamableFile` (built-in Nest) với option `type`                                                                                    | Nest đã có sẵn kiểu trả về cho file streaming, tự quản lý response lifecycle (exception filter/interceptor vẫn hoạt động), không cần thoát ra `@Res()` không kiểm soát.                               |
| Interface `UserEnvelope`/`ProfileEnvelope` tự khai trong `test/utils/` chỉ để ép kiểu `res.body`                                                                       | Import thẳng `UserResponseDto`/`ProfileResponseDto` từ `src/modules/.../dto/`                                                         | DTO thật đã tồn tại trong `src` — khai lại một interface song song chỉ để test là duplicate; DTO đổi field mà quên sửa test thì test vẫn "xanh" giả.                                                  |
| `const SALT_ROUNDS = 10` khai riêng trong `auth.service.ts`, trùng với `SALT_ROUNDS` đã export ở `users/constants/users.constants.ts`                                  | Import `SALT_ROUNDS` từ `users.constants.ts`                                                                                          | 2 module cùng hash password nhưng dùng 2 hằng số độc lập — đổi cost factor ở 1 chỗ, chỗ kia âm thầm lệch, không compile error nào báo.                                                                |
| `POSTGRES_UNIQUE_VIOLATION = '23505'` + logic map lỗi unique-violation khai riêng ở cả `users.service.ts` và `follows.service.ts`                                      | `src/common/utils/postgres-unique-violation.util.ts` export `isUniqueViolation()`/`getViolatedConstraint()`, cả 2 service cùng import | Cùng 1 khái niệm ("đây có phải lỗi trùng khoá không") bị cài đặt lại y hệt ở 2 nơi — sửa 1 chỗ (vd đổi driver DB, thêm constraint mới) rất dễ quên chỗ còn lại.                                       |
| `expiresIn: Number(config.get('JWT_EXPIRES_IN')) \|\| 86400` và `process.env.PORT ?? 3000` tự default lại giá trị mà `Joi` schema (`env.validation.ts`) đã default sẵn | `config.getOrThrow<number>('JWT_EXPIRES_IN')`, `configService.getOrThrow<number>('PORT')`                                             | Joi là nguồn sự thật duy nhất cho default/validate env var; tự default thêm lần 2 vừa dư thừa vừa có bug thật (`value \|\| default` biến `0` hợp lệ thành default sai) khi giá trị đúng lại là falsy. |

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

## 17. Core/Base — Line ending, format gate, đọc env var, TS strict, bootstrap

**17.1 — Line ending: LF bắt buộc, cố định bằng `.gitattributes`.**

**Vì sao:** Windows checkout với `core.autocrlf=true` tự convert LF → CRLF trên đĩa dù blob trong git vẫn là LF — gây `git add` liên tục cảnh báo "LF will be replaced by CRLF", và `prettier --check` (mặc định `endOfLine: "lf"`) fail trên chính những file không hề đổi nội dung, chỉ khác line ending do OS của người checkout.

**Rule:** Repo có `.gitattributes` với `* text=auto eol=lf` — mọi file text luôn checkout ra LF bất kể OS. `.prettierrc` và `eslint.config.mjs` đều khai rõ `endOfLine: "lf"` (không dùng `"auto"`) để 2 công cụ đồng nhất, không cái nào tolerant hơn cái kia.

**Quan trọng — thêm `.gitattributes` KHÔNG tự sửa file đã checkout trước đó.** Attribute chỉ áp dụng cho lần checkout/clean tiếp theo, nên các file đã nằm trên đĩa từ trước vẫn giữ CRLF. Hệ quả đã thực sự xảy ra trong repo này: blob trong git là LF (`git ls-files --eol` báo `i/lf`) nhưng working tree vẫn `w/crlf` ở 17 file (`data-source.ts`, `tsconfig.json`, `package.json`, `.github/workflows/ci.yml`, `src/i18n/**/*.json`, ...) — và `prettier --check .` fail đúng 17 file đó dù không ai sửa nội dung.

**Cách kiểm tra & sửa:**

```bash
git ls-files --eol | grep w/crlf   # rỗng = working tree đã sạch LF
git add --renormalize .            # chuẩn hoá lại LF; vì blob đã là LF nên diff nội dung = 0
```

Sau khi renormalize, `git diff --exit-code` phải trả về 0 cho các file đó (chỉ đổi line ending trên đĩa, không đổi nội dung commit). Lưu ý `core.autocrlf=true` cấu hình cục bộ trên Windows **không** thắng được `.gitattributes` — attribute luôn ưu tiên hơn, nên không cần và không nên đi tắt bằng cách sửa `core.autocrlf` từng máy.

**17.2 — CI phải chạy bản lint/format không tự sửa.**

**Vì sao:** `npm run lint` (`eslint --fix`) tự sửa luôn lỗi format ngay trong bản checkout tạm của CI rồi mới báo kết quả — nghĩa là CI **không bao giờ thực sự chặn** được code format sai lọt vào repo, chỉ tự vá và pass, tạo cảm giác an toàn giả.

**Rule:** Có 2 cặp script riêng biệt:

- `npm run lint` / `npm run format` — có `--fix`/`--write`, dùng khi code cục bộ (dev tự sửa).
- `npm run lint:check` / `npm run format:check` — không có `--fix`/`--write`, chỉ báo lỗi rồi exit non-zero. **CI (`ci.yml`) chỉ được dùng cặp `:check`**, không bao giờ dùng bản có `--fix`.

**Gate phải phủ CẢ REPO, không chỉ glob `src`/`test`.** Trước đây script dùng glob thủ công (`prettier --check "src/**/*.ts" "test/**/*.ts"`, `eslint "{src,apps,libs,test}/**/*.ts"`) nên **không** phủ: `data-source.ts` (file TS thật ở root, có 7 lỗi format mà CI không thấy), `eslint.config.mjs`, toàn bộ `*.json` / `*.yml` / `*.md` (kể cả `ci.yml`, `tsconfig.json`, `src/i18n/**`). Glob "an toàn" như vậy là cách âm thầm nhất để gate mất tác dụng — file không khớp glob thì không bao giờ fail.

**Rule:** dùng `prettier --check .` / `prettier --write .` và `eslint .` (flat config tự quyết định file nào được lint), rồi khai loại trừ **một nơi duy nhất**: `.prettierignore` cho prettier, `ignores: [...]` trong `eslint.config.mjs` cho eslint (`dist`, `coverage`, `storage`, `package-lock.json`, `.sunlint-eslint.config.js`). Thêm file/loại file mới vào repo là tự động được gate, không phải nhớ sửa glob.

**17.3 — Đọc env var: `ConfigService.getOrThrow()`, trừ `registerAs()` factory.**

**Rule:** Env var đã khai trong `envValidationSchema` (Joi, `.required()` hoặc có `.default()`) thì đọc qua `ConfigService.getOrThrow<T>('KEY')` ở bất kỳ đâu có DI (controller, service, module factory nhận `ConfigService` qua `inject`) — không đọc thẳng `process.env`, không tự default/parse lại lần 2 (xem thêm mục 15).

**Ngoại lệ hợp lệ — `registerAs()` factory (vd `typeorm.config.ts`):** factory này chạy trong `ConfigModule.forRoot({ load: [...] })`, **trước khi `ConfigService` tồn tại** (tránh vòng phụ thuộc: `ConfigService` chính là thứ tổng hợp kết quả của các factory này). Ở đây đọc thẳng `process.env` và tự parse (`Number(process.env.DB_PORT)`) là **đúng chuẩn NestJS**, không phải vi phạm rule trên — vì không có `ConfigService` nào để inject ở thời điểm này. Joi vẫn validate `process.env` gốc ở bước khác trong `ConfigModule.forRoot()`, nên vẫn an toàn.

**Ngoại lệ hợp lệ thứ hai — script CLI chạy ngoài Nest (`data-source.ts`):** file này được `typeorm-ts-node-commonjs` gọi trực tiếp cho migration, **không có Nest container** nên cũng không có `ConfigService`; nó tự `dotenv.config()` rồi tái sử dụng `buildDataSourceOptions()` chung với `typeorm.config.ts` (không copy lại option — xem mục 15). Đây là ngoại lệ được chấp nhận, cùng lý do với `registerAs()`.

**Không dùng `config.get<T>('KEY')!` (non-null assertion) để lách rule.** `get()` + `!` cho cùng kết quả runtime là `undefined` khi thiếu key, chỉ khác là compiler bị bịt miệng: app boot lên với config rỗng và fail ở chỗ khác, xa nguyên nhân. `getOrThrow()` throw ngay tại boot với đúng tên key. Áp dụng cả cho key do `registerAs()` nạp vào: `config.getOrThrow<DataSourceOptions>('typeorm')`.

**Áp dụng:** trước khi viết `config.get('KEY')` hay `process.env.KEY`, tự hỏi: (1) đang ở trong `registerAs()` factory / script CLI ngoài Nest, hay code có DI bình thường? (2) nếu có DI → `getOrThrow()`; nếu là `registerAs()` factory hoặc `data-source.ts` → `process.env` trực tiếp là chấp nhận được. Module có option phụ thuộc env (vd `I18nModule`) thì dùng bản `forRootAsync({ inject: [ConfigService], useFactory })` để đọc qua `getOrThrow()`, không đọc `process.env` trong `forRoot()` tĩnh.

**17.4 — TypeScript strict là bắt buộc.**

**Vì sao:** các rule về type (mục 4 — tách interface, mục 15 — không tự khai lại type có sẵn) chỉ có giá trị nếu compiler thật sự bắt được sai lệch. Cấu hình cũ (`noImplicitAny: false`, `strictBindCallApply: false`, cộng với `@typescript-eslint/no-explicit-any: 'off'` trong eslint) làm đúng phần ngược lại: type sai vẫn compile, `any` lan âm thầm, và những rule trên trở thành quy ước danh dự chứ không phải gate.

**Rule:** `tsconfig.json` bật `"strict": true`, kèm `"strictPropertyInitialization": false` — ngoại lệ duy nhất và bắt buộc, vì entity TypeORM và DTO khai field không initializer (`id: string;`) và được TypeORM/class-transformer gán lúc runtime; bật flag này sẽ báo lỗi giả ở toàn bộ entity/DTO. `noFallthroughCasesInSwitch` để `true`.

Phía eslint đi cùng hướng: `@typescript-eslint/no-explicit-any` và `no-unsafe-argument` để `'error'` (không `'off'`, không `'warn'`). Để `'warn'` là gây nhầm lẫn vì script đã có `--max-warnings=0` — warning vẫn fail build, nhưng đọc config lại tưởng là không.

**Kiểm chứng khi đổi:** `npx tsc -p tsconfig.json --noEmit --strict --strictPropertyInitialization false` và `npx eslint . --rule '{"@typescript-eslint/no-explicit-any":"error"}'` — codebase hiện tại pass với **0 lỗi** ở cả hai, nên không có lý do gì để nới các flag này. Nếu code mới làm nó fail, sửa code chứ không nới flag.

**17.5 — Bootstrap & lifecycle.**

**Rule:**

- Pipe/interceptor/filter toàn cục khai trong `common/bootstrap/configure-app.ts`, để `main.ts` và `test/utils/create-test-app.ts` dùng **cùng một** cấu hình (xem mục 2.1).
- `main.ts` phải gọi `app.enableShutdownHooks()`. Không có nó, Nest **không** chạy `OnModuleDestroy` khi process nhận SIGTERM/SIGINT — `RedisService.onModuleDestroy()` (`client.quit()`) sẽ không bao giờ được gọi trong production, connection Redis bị cắt cụt thay vì đóng sạch. E2E test không phát hiện được vì test tự gọi `app.close()`.
- Log dùng `Logger` của `@nestjs/common`, **không** `console.*` — kể cả trong `bootstrap().catch()`. `console` bỏ qua toàn bộ format/level/context của Nest logger, làm log production không đồng nhất và không thể tắt/route lại được.

---

## 18. Query Performance — Index theo cột sort, tránh vật chất hoá id list, tránh query lặp

**Bối cảnh:** Reviewer phát hiện 3 vấn đề trên PR4 (`articles`) bằng `EXPLAIN ANALYZE` với dữ liệu seed lớn (100k article, user có 70k favorite) — không phải lỗi logic, mà là code đúng khi dữ liệu nhỏ và vỡ dần khi dữ liệu lớn lên.

**18.1 — Index đúng cột dùng để `ORDER BY` trên mọi query list/feed.**

**Rule:** Cột nào xuất hiện trong `ORDER BY` của một query chạy trên **mọi** request list/feed (không phải filter tuỳ chọn) phải có index, kể cả khi migration đã có index cho các cột filter khác.

**Vì sao:** không có index cho `ORDER BY`, Postgres phải quét toàn bảng rồi sort mới lấy được N dòng đầu, bất kể `WHERE` match ít hay nhiều. Đo thật trên `articles` (100k dòng, trang 20 dòng đầu): thiếu index → `Seq Scan` + sort tốn 61,5ms/1.745 buffer; thêm `CREATE INDEX ... ("created_at" DESC, "id")` → còn 0,063ms/4 buffer, vì Postgres đọc index đúng thứ tự cần, không phải sort riêng.

**Áp dụng:** khi thêm bảng mới có endpoint list/feed sort theo 1 cột cố định (thường `created_at DESC`), thêm index cho cột đó ngay trong migration tạo bảng — không đợi đo mới thêm.

**18.2 — Không vật chất hoá id list vào app rồi bind `IN (...)` khi tập id đó không có cận trên cố định — dùng `EXISTS` trong SQL.**

**Sai:**

```typescript
const favoritedArticleIds = await this.favoritesService.getFavoritedArticleIds(
  favoritedBy.id,
); // không giới hạn, kéo hết id
query.andWhere('article.id IN (:...favoritedArticleIds)', {
  favoritedArticleIds: [...favoritedArticleIds],
});
```

**Vì sao:** kích thước id list ở đây tỉ lệ với dữ liệu của **user** (bao nhiêu bài đã favorite / đang follow), không tỉ lệ với kích thước trang kết quả — nên không có cận trên tự nhiên. Đo thật: user có 70.000 favorite → `GET /articles?favorited=...` trả `500 QueryFailedError: bind message has 4464 parameter formats but 0 parameters` (giao thức Postgres đếm tham số bằng số nguyên 16-bit, vượt 65.535 là tràn) — thông báo lỗi không gợi ý gì tới nguyên nhân thật. Hạ xuống 60.000 thì không lỗi nhưng mất 895ms/request (so với 18ms khi chỉ có 20 favorite), vì mỗi request đều kéo 60.000 dòng về Node rồi dựng lại câu SQL 60.000 tham số.

**Đúng:**

```typescript
query.andWhere(
  'EXISTS (SELECT 1 FROM article_favorites f WHERE f.article_id = article.id AND f.user_id = :favoritedById)',
  { favoritedById: favoritedBy.id },
);
```

**Áp dụng:** khi filter/feed dựa trên "user X có quan hệ gì với tập bản ghi Y" (favorite, follow, ...), viết `EXISTS (SELECT 1 FROM <join_table> ...)` ngay trong query builder thay vì gọi service khác lấy `Set<id>` rồi `IN (...)` — trừ khi tập id đó vốn đã bị giới hạn nhỏ và cố định (vd chỉ trong phạm vi id của 1 trang kết quả đã `LIMIT`, như `getFavoritesCountMap`/`getFavoritedArticleIds(userId, articleIds)` dùng khi compose response, khác với dùng để filter).

**18.3 — Không lặp lại một query mà kết quả đã được điều kiện filter phía trước đảm bảo sẵn.**

**Sai:** `feed()` lọc `article.authorId` theo tập đang follow, rồi bước compose response lại gọi `FollowsService.getFollowingIds()` lần nữa chỉ để tính field `author.following` — trong khi ở feed, **theo định nghĩa**, author nào cũng đang được follow.

**Đúng:** truyền thẳng flag/giá trị đã biết xuống bước compose response, không hỏi lại DB một sự thật mà tầng gọi trước đó vừa dùng để filter.

**Áp dụng:** trước khi thêm 1 query batch (`getXxxIds`) vào bước compose response, tự hỏi: điều kiện `WHERE`/filter của query chính có đang đảm bảo sẵn kết quả này cho **mọi** dòng trả về không? Nếu có, truyền thẳng giá trị đó xuống thay vì hỏi lại (xem `toListResponseDto(..., { allAuthorsFollowed: true })` trong `articles.service.ts`).

---

## 19. Checklist trước khi tạo PR

- [ ] Controller không chứa business logic — chỉ gọi service.
- [ ] Mỗi module đúng 1 domain, không lẫn nghiệp vụ khác; không có import vòng giữa module (mục 10).
- [ ] `{feature}.controller.ts`/`.service.ts`/`.module.ts` phẳng ở root module; `dto/`, `entities/`, `guards/`, `constants/`, `interfaces/`... đúng subfolder theo vai trò (mục 2.2).
- [ ] File mới đặt đúng tầng: dùng chung → `common/` (helper hậu tố `.util.ts`), infra → `src/{infra}/`, nghiệp vụ → `src/modules/{feature}/` (mục 2.1). `common/` không import giá trị từ `modules/` — nếu cần shape thì `import type` (mục 10).
- [ ] Pipe/filter/interceptor toàn cục thêm vào `configure-app.ts`, không thêm riêng ở `main.ts` (mục 17.5) — nếu không, e2e chạy thiếu và test xanh giả.
- [ ] Không còn inline object type lặp lại — đã tách `interface`.
- [ ] Không tự định nghĩa lại type/constant mà thư viện hoặc codebase đã có sẵn; env var đã có trong Joi schema thì đọc qua `ConfigService.getOrThrow()`, không tự default lại (mục 15).
- [ ] Có transaction cho thao tác ghi nhiều bảng — **và mọi Repository call bên trong callback thực sự dùng `manager` được truyền vào**, không phải Repository inject mặc định (mục 6). Nếu transaction gọi sang service khác, method đó phải nhận `manager?: EntityManager` và dùng nó.
- [ ] Guard input rỗng trước khi update DB.
- [ ] Bắt lỗi unique violation → trả `ConflictException` với message đúng field (dùng chung `isUniqueViolation()`/`getViolatedConstraint()` ở `common/utils`, không tự viết lại check `error.driverError.code`).
- [ ] Upload file có `fileFilter` allow-list MIME type.
- [ ] Guard auth-optional (override `handleRequest`) chỉ fail-open khi không có lỗi; có lỗi thật (token revoke, strategy throw...) phải rethrow (mục 16).
- [ ] Response thành công đi qua `XxxResponseDto.fromEntity()`, đúng envelope (mục 9); filter lỗi vẫn là catch-all `@Catch()` để lỗi non-HTTP cũng trả đúng envelope (mục 9).
- [ ] Có unit test cho happy path + lỗi validate + edge case rỗng/null (mục 11).
- [ ] Có e2e test nếu flow xuyên ≥2 module hoặc phụ thuộc DB constraint/transaction thật (mục 11).
- [ ] Env var đọc qua `ConfigService.getOrThrow()`, trừ `registerAs()` factory và `data-source.ts` (mục 17.3); không dùng `get()` + `!`.
- [ ] `git ls-files --eol | grep w/crlf` rỗng — working tree sạch LF (mục 17.1).
- [ ] `tsconfig.json` vẫn `strict: true`; không nới flag để code mới compile (mục 17.4).
- [ ] Chạy `npm run lint:sunlint` — 0 errors; warning mới phát sinh phải được review, warning đã biết xem mục 14. Đây là gate cục bộ, CI không chạy được (mục 14).
- [ ] Chạy `npm run lint:check` và `npm run format:check` (bản không `--fix`/`--write`, phủ **cả repo** chứ không chỉ `src`/`test`) — đây là bản CI thật sự chạy, không phải `lint`/`format` (mục 17.2).
- [ ] Chạy `npm run build`, `npm test`, và `npm run test:e2e` — cả 3 đều pass.
- [ ] Query list/feed chạy trên mọi request có index cho cột `ORDER BY` (mục 18.1).
- [ ] Filter/feed theo quan hệ user↔bản ghi (favorite, follow...) dùng `EXISTS` trong SQL, không kéo id list vào app rồi `IN (...)` khi tập đó không có cận trên cố định (mục 18.2).
- [ ] Không có query nào hỏi lại một sự thật mà điều kiện filter/where của bước trước đã đảm bảo sẵn (mục 18.3).
