# 📄 Product Requirements Document (PRD): Sistem Manajemen Tiket dan Acara

## 1. Ikhtisar & Tujuan (Overview & Objective)
Sistem ini adalah platform manajemen tiket dan acara yang dibangun dengan arsitektur backend modern menggunakan **NestJS 11, Node.js (>v20.0), TypeScript, PostgreSQL, dan Redis** [1]. Tujuannya adalah memfasilitasi pembuatan acara oleh pengelola (Admin) dan proses pencarian hingga pembelian tiket secara mandiri oleh pelanggan (Pengguna) [2].

Sistem ini didesain dengan prinsip **Arsitektur Modular**, mengedepankan skalabilitas, keamanan (JWT Auth & Role-based Access), serta performa tinggi dengan pemrosesan di latar belakang (background jobs) menggunakan BullMQ dan Redis [1, 3].

## 2. Aktor & Hak Akses
Sistem ini memiliki dua aktor utama [2]:
*   **Admin (Pengelola):** Memiliki hak penuh untuk mengelola data master pengguna, membuat dan memperbarui acara (Event), mempublikasikan acara, memantau Order (pesanan), dan melihat dasbor laporan.
*   **Pengguna (Pelanggan):** Dapat melihat daftar acara yang dipublikasi, melakukan proses pembelian tiket secara mandiri, menerima tiket (PDF & QR Code), serta mengelola profil.

## 3. Fitur Utama & Alur Kerja (General Feature Overview)
1.  **Authentication & Users:** Registrasi, login, integrasi middleware JWT, dan Authorization berbasis peran (Admin/User) [2, 4].
2.  **Event Management:** CRUD pada Kategori Acara dan Acara, fitur Publish/Unpublish, serta fitur pencarian dan *pagination* [2, 4].
3.  **Order & Ticketing:** Pembuatan pesanan tiket, pelacakan status pesanan (PENDING, PAID, EXPIRED), penerbitan tiket PDF, serta *generator* QR Code unik untuk setiap tiket [2, 4].
4.  **Notification & Integrations:** 
    *   Integrasi *Payment Gateway* Xendit untuk simulasi pembayaran [3, 4].
    *   Pengiriman *email* otomatis melalui *worker* untuk tautan unduh tiket dan pengingat (reminder) acara [3, 4].
    *   Penyimpanan aset (*Object Storage*) menggunakan Minio untuk *file* unggahan, PDF, dan QR Code [3].
5.  **Dashboard Admin:** Ringkasan penjualan berdasarkan rentang tanggal, acara teratas, dan kategori acara paling menguntungkan [2].

---

## 4. Standar Pengembangan & Arsitektur Sistem (Engineering Standards)

Pengembangan sistem wajib mematuhi pedoman teknis berikut untuk menjaga kualitas kode dan stabilitas sistem:

### A. Arsitektur Berbasis NestJS
*   **Modularitas:** Sistem dibangun dengan memecah fungsionalitas menjadi banyak Modul (misal: `UsersModule`, `OrdersModule`) agar kode lebih rapi dan dapat disematkan ke dalam satu modul utama [5, 6].
*   **Pemisahan Layer:** 
    *   **Controllers:** Digunakan sebagai kelas yang bertugas memproses *HTTP request* masuk dan mengembalikan *HTTP response* [7].
    *   **Providers/Services:** Semua logika bisnis akan diletakkan di dalam *Service* (sebagai Provider) yang disuntikkan (*Dependency Injection*) menggunakan dekorator `@Injectable()` [8, 9].
*   **Pipa Validasi (Validation Pipe) & DTO:** Memastikan tipe data dan *payload* yang diterima sesuai dengan format yang diinginkan menggunakan *Validation Pipe* [10].

### B. Standar RESTful API (DOT Indonesia Guideline)
*   **Desain URL:** Gunakan kata benda jamak (plural nouns) dan hindari kata kerja pada *endpoint*. Contoh: `GET /events` (bukan `/get-events`), `POST /orders` [11, 12].
*   **Format Respons Konsisten:** Semua respons berhasil wajib mengembalikan *primary data* di dalam properti utama `data` (baik sebagai objek tunggal maupun *array*) [13, 14].
*   **Format Respons Gagal:** Kesalahan (*error*) wajib dibungkus dalam *array* `errors` dengan memuat informasi `key` (lokasi atribut yang salah) dan `value` (pesan kesalahan) [15, 16].
*   **Kode Status HTTP:**
    *   `200 OK` untuk pembacaan dan pembaruan, `201 Created` untuk *request* POST yang sukses membuat data [17, 18].
    *   `400 Bad Request` untuk ketidaksesuaian sintaks/validasi, `401 Unauthorized` untuk gagal autentikasi, `404 Not Found` jika sumber daya tidak ada, dan `500 Internal Server Error` untuk kegagalan penanganan pada server [18, 19].

### C. Implementasi Database dengan TypeORM
*   **Repository Pattern & Data Mapper:** Manipulasi *database* wajib dikelola melalui lapisan *Repository* yang terpisah dari struktur bisnis, memastikan skalabilitas dan independensi *coupling* [20, 21].
*   **Entity Models:** Relasi *database* dipetakan menggunakan entitas TypeORM (dengan dekorator `@Entity()`, `@PrimaryGeneratedColumn()`, dan relasional aktif seperti `@OneToMany` atau `@ManyToOne`) [22-24].

### D. Prinsip Clean Code (Refactoring Guru)
*   **Hindari Code Smells:** Jangan menulis *Controller* atau *Service* dengan metode yang terlalu panjang (*Long Method*) atau membuat kelas raksasa (*Large Class*). Fungsi besar wajib dipecah (*Extract Method*) [25].
*   **Simplifikasi Kondisional:** Gunakan klausa penjaga (*Guard Clauses*) untuk membatalkan proses lebih awal (*return early*) demi menghindari pernyataan percabangan logika (*nested if*) bersarang yang sulit dibaca [25].
*   **Parameter Object:** Hindari argumen panjang dalam metode (*Long Parameter List*). Bungkus ke dalam objek Data Transfer (DTO) atau *Parameter Object* [25].
