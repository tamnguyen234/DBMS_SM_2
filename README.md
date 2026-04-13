# Storage Management VLab

Ung dung web mo phong 4 kieu to chuc file trong mon Storage Management:

- Heap
- Sequential
- Multitable Clustering
- Partitioning

He thong gom:

- Backend Flask (`main.py`) doc/ghi du lieu that tu thu muc `data/`
- Frontend SPA (`index.html`, `app.js`, `styles.css`) de mo phong va truc quan block

## Tinh nang hien co

1. Demo Truy van
- Truy van theo `student_id`, `full_name`, `class_name`, `semester`
- Hien thi block duoc doc va thoi gian mo phong tren 4 kieu to chuc

2. Demo Them Ban ghi
- Them 1 ban ghi moi vao du lieu that qua API `/api/insert`
- Cap nhat truc quan block va thong ke sau moi lan chen

3. Thong ke va So sanh
- Tong hop chi so blocks read va execution time cho truy van/them du lieu

## Cau hinh quan trong

- Block capacity frontend: `1 block = 5 records`
- Sequential demo su dung muc lap day 4 records/block de minh hoa free slot
- Demo dataset tra ve tu API `/api/dataset` (lay mau tu du lieu that de giu giao dien muot)

## Chay du an

1. Cai dependencies:

```bash
pip install -r requirements.txt
```

2. Chay server:

```bash
python main.py
```

3. Mo trinh duyet:

```text
http://127.0.0.1:8000
```

## Du lieu

- `data/students.txt`: thong tin sinh vien
- `data/enrollments.txt`: thong tin dang ky hoc
- `data/courses.txt`: thong tin hoc phan

Script khoi phuc du lieu mau:

```powershell
./restore_backup_data.ps1
```
