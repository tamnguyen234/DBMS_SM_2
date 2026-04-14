from __future__ import annotations

import csv
import time
import threading
import random
from flask import Flask, jsonify, request

app = Flask(__name__, static_folder='.', static_url_path='')

# Data cache
STUDENTS = {}
ENROLLMENTS = []
DEMO_DATASET = []
DEMO_SIZE = 5000
FULL_DATASET = []
ORG_CACHE = {}
DATA_LOCK = threading.Lock()
CLUSTER_ORDER = [
    "K20A", "K20B", "K20C", "K21A", "K21B", "K21C", "K22A", "K22B", "K22C",
    "K23A", "K23B", "K23C", "K24A", "K24B", "K24C", "K25A", "K25B", "K25C",
    "K26A", "K26B", "K26C", "K27A", "K27B", "K27C", "K28A", "K28B", "K28C",
    "K29A", "K29B", "K29C", "K30A", "K30B", "K30C", "K31A", "K31B", "K31C",
    "K32A", "K32B", "K32C", "K33A", "K33B", "K33C", "K34A", "K34B", "K34C",
    "K35A", "K35B", "K35C"
]


def load_data():
    global STUDENTS, ENROLLMENTS, DEMO_DATASET, FULL_DATASET, ORG_CACHE
    
    # Load students
    STUDENTS = {}
    with open('data/students.txt', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            STUDENTS[int(row['student_id'])] = {
                'student_id': int(row['student_id']),
                'full_name': row['full_name'],
                'class_name': row['class_name'],
                'email': row['email'],
                'phone': row['phone']
            }
    
    # Load enrollments
    ENROLLMENTS = []
    with open('data/enrollments.txt', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            ENROLLMENTS.append({
                'student_id': int(row['student_id']),
                'course_id': int(row['course_id']),
                'semester': row['semester'],
                'score': float(row['score'])
            })
    
    # Build demo dataset for UI visualization (bounded size to keep frontend responsive)
    DEMO_DATASET = []
    step = max(1, len(ENROLLMENTS) // DEMO_SIZE)
    sample_indexes = range(0, len(ENROLLMENTS), step)

    for i, idx in enumerate(sample_indexes):
        if len(DEMO_DATASET) >= DEMO_SIZE:
            break
        enroll = ENROLLMENTS[idx]
        student_id = enroll['student_id']
        if student_id in STUDENTS:
            record = {
                'id': i,
                'student_id': student_id,
                'full_name': STUDENTS[student_id]['full_name'],
                'class_name': STUDENTS[student_id]['class_name'],
                'semester': enroll['semester'],
                'score': enroll['score']
            }
            DEMO_DATASET.append(record)

    # Build full joined dataset once. Query APIs reuse this cache.
    FULL_DATASET = []
    for enroll in ENROLLMENTS:
        student_id = enroll['student_id']
        if student_id not in STUDENTS:
            continue
        FULL_DATASET.append({
            'student_id': student_id,
            'full_name': STUDENTS[student_id]['full_name'],
            'class_name': STUDENTS[student_id]['class_name'],
            'semester': enroll['semester'],
            'score': enroll['score']
        })

    cluster_rank = {name: idx for idx, name in enumerate(CLUSTER_ORDER)}
    
    heap_blocks = []
    curr_block = []
    for rec in FULL_DATASET:
        if len(curr_block) >= 5:
            heap_blocks.append(curr_block)
            curr_block = []
        curr_block.append(rec)
    if curr_block:
        while len(curr_block) < 5:
            curr_block.append(None)
        heap_blocks.append(curr_block)

    for block in heap_blocks:
        if random.random() < 0.15:
            idx = random.randrange(5)
            block[idx] = None

    sequential_records = sorted(FULL_DATASET, key=lambda r: r['student_id'])
    clustering_records = sorted(
        FULL_DATASET,
        key=lambda r: (cluster_rank.get(r['class_name'], 10**9), r['student_id'])
    )
    partition_by_semester = {}
    for rec in FULL_DATASET:
        sem = rec['semester']
        partition_by_semester.setdefault(sem, []).append(rec)

    ORG_CACHE = {
        'Heap': heap_blocks,
        'Sequential': sequential_records,
        'Clustering': clustering_records,
        'Partitioning': partition_by_semester,
    }


def _next_student_id():
    if not STUDENTS:
        return 1
    return max(STUDENTS.keys()) + 1


def _append_student_to_file(student_id, full_name, class_name):
    with open('data/students.txt', 'a', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([
            student_id,
            full_name,
            class_name,
            f'student{student_id:07d}@uni.edu',
            f'09{student_id:08d}'[-10:]
        ])


def _append_enrollment_to_file(student_id, semester, score):
    # Keep course_id fixed for demo inserts; persistence requirement focuses on storage behavior.
    with open('data/enrollments.txt', 'a', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow([student_id, 0, semester, f'{score:.1f}'])


def _insert_into_caches(record):
    student_id = record['student_id']

    STUDENTS[student_id] = {
        'student_id': student_id,
        'full_name': record['full_name'],
        'class_name': record['class_name'],
        'email': f'student{student_id:07d}@uni.edu',
        'phone': f'09{student_id:08d}'[-10:]
    }

    ENROLLMENTS.append({
        'student_id': student_id,
        'course_id': 0,
        'semester': record['semester'],
        'score': record['score']
    })

    FULL_DATASET.append({
        'student_id': student_id,
        'full_name': record['full_name'],
        'class_name': record['class_name'],
        'semester': record['semester'],
        'score': record['score']
    })

    inserted_heap = False
    for block in ORG_CACHE['Heap']:
        for i in range(len(block)):
            if block[i] is None:
                block[i] = FULL_DATASET[-1]
                inserted_heap = True
                break
        if inserted_heap:
            break
    if not inserted_heap:
        ORG_CACHE['Heap'].append([FULL_DATASET[-1], None, None, None, None])

    seq = ORG_CACHE['Sequential']
    seq.append(FULL_DATASET[-1])
    seq.sort(key=lambda r: r['student_id'])

    cluster_rank = {name: idx for idx, name in enumerate(CLUSTER_ORDER)}
    clu = ORG_CACHE['Clustering']
    clu.append(FULL_DATASET[-1])
    clu.sort(key=lambda r: (cluster_rank.get(r['class_name'], 10**9), r['student_id']))

    part = ORG_CACHE['Partitioning']
    part.setdefault(record['semester'], []).append(FULL_DATASET[-1])


def ensure_data_loaded():
    """Load data if cache is empty (supports flask run and direct execution)."""
    if not STUDENTS or not ENROLLMENTS:
        load_data()


def _record_matches(rec, student_id=None, full_name=None, class_name=None, semester=None):
    if student_id is not None and rec['student_id'] != student_id:
        return False
    if full_name is not None and full_name.lower() not in rec['full_name'].lower():
        return False
    if class_name is not None and rec['class_name'] != class_name:
        return False
    if semester is not None and rec['semester'] != semester:
        return False
    return True


def _pack_blocks(records, block_capacity=5):
    return [records[i:i + block_capacity] for i in range(0, len(records), block_capacity)]


def _visible_window(blocks, first_match_idx, max_visible=6):
    if len(blocks) <= max_visible:
        return 0, len(blocks)
    if first_match_idx < 0:
        return 0, max_visible
    start = max(0, first_match_idx - max_visible // 2)
    if start + max_visible > len(blocks):
        start = max(0, len(blocks) - max_visible)
    return start, start + max_visible


def _simulate_query_for_manager(name, records, student_id, full_name, class_name, semester, block_capacity=5):
    started = time.perf_counter()

    if name == 'Heap':
        blocks = records  # ORG_CACHE['Heap'] now holds explicit blocks
    else:
        blocks = _pack_blocks(records, block_capacity)
        
    matches_count = 0
    first_match_block = -1

    for block_idx, block in enumerate(blocks):
        has_match_in_block = False
        for rec in block:
            if rec is not None and _record_matches(rec, student_id, full_name, class_name, semester):
                matches_count += 1
                has_match_in_block = True
        if has_match_in_block and first_match_block < 0:
            first_match_block = block_idx

    end_idx_start, end_idx = _visible_window(blocks, first_match_block, max_visible=6)
    visible_blocks = []
    for idx in range(end_idx_start, end_idx):
        block_records = []
        for rec in blocks[idx]:
            if rec is None or rec.get('__empty'):
                block_records.append({'__empty': True})
            else:
                block_records.append({
                    **rec,
                    'isTarget': _record_matches(rec, student_id, full_name, class_name, semester)
                })
        visible_blocks.append({
            'blockNumber': idx + 1,
            'records': block_records
        })

    elapsed_ms = (time.perf_counter() - started) * 1000
    return {
        'manager': name,
        'matchesCount': matches_count,
        'blocksRead': len(blocks),
        'totalBlocks': len(blocks),
        'executionTime': round(elapsed_ms, 4),
        'blocks': visible_blocks
    }


def _simulate_query_partitioning(student_id, full_name, class_name, semester, block_capacity=5):
    started = time.perf_counter()

    by_semester = ORG_CACHE.get('Partitioning', {})
    semesters = sorted(by_semester.keys())
    if semester is not None:
        semesters = [semester] if semester in by_semester else []

    partition_blocks = []
    for sem in semesters:
        blocks = _pack_blocks(by_semester.get(sem, []), block_capacity)
        for local_idx, block in enumerate(blocks):
            partition_blocks.append({
                'partition': sem,
                'blockNumber': local_idx + 1,
                'records': block
            })

    matches_count = 0
    first_match_block = -1
    for idx, block in enumerate(partition_blocks):
        has_match_in_block = False
        for rec in block['records']:
            if _record_matches(rec, student_id, full_name, class_name, semester):
                matches_count += 1
                has_match_in_block = True
        if has_match_in_block and first_match_block < 0:
            first_match_block = idx

    start_idx, end_idx = _visible_window(partition_blocks, first_match_block, max_visible=6)
    visible_blocks = []
    for idx in range(start_idx, end_idx):
        block = partition_blocks[idx]
        visible_blocks.append({
            'partition': block['partition'],
            'blockNumber': block['blockNumber'],
            'records': [
                {
                    **rec,
                    'isTarget': _record_matches(rec, student_id, full_name, class_name, semester)
                }
                for rec in block['records']
            ]
        })

    elapsed_ms = (time.perf_counter() - started) * 1000
    return {
        'manager': 'Partitioning',
        'matchesCount': matches_count,
        'blocksRead': len(partition_blocks),
        'totalBlocks': len(partition_blocks),
        'executionTime': round(elapsed_ms, 4),
        'blocks': visible_blocks
    }


ensure_data_loaded()


def query_enrollments(student_id=None, full_name=None, class_name=None, semester=None):
    """Query enrollments based on filters."""
    # Only use non-empty values as query conditions.
    full_name = full_name.strip() if isinstance(full_name, str) and full_name.strip() else None
    class_name = class_name.strip() if isinstance(class_name, str) and class_name.strip() else None
    semester = semester.strip() if isinstance(semester, str) and semester.strip() else None

    return [
        rec for rec in FULL_DATASET
        if _record_matches(rec, student_id, full_name, class_name, semester)
    ]


@app.route('/')
def serve_index():
    return app.send_static_file('index.html')


@app.route('/api/dataset')
def get_dataset():
    """Get sampled dataset for UI visualization."""
    ensure_data_loaded()
    return jsonify(DEMO_DATASET)


@app.route('/api/query', methods=['GET'])
def api_query():
    """Query full dataset"""
    ensure_data_loaded()
    student_id_param = request.args.get('student_id')
    full_name = request.args.get('full_name')
    class_name = request.args.get('class_name')
    semester = request.args.get('semester')
    
    # Convert student_id to int if provided
    student_id = None
    if student_id_param:
        try:
            student_id = int(student_id_param)
        except ValueError:
            pass

    full_name = full_name.strip() if isinstance(full_name, str) and full_name.strip() else None
    class_name = class_name.strip() if isinstance(class_name, str) and class_name.strip() else None
    semester = semester.strip() if isinstance(semester, str) and semester.strip() else None
    
    results = query_enrollments(
        student_id=student_id,
        full_name=full_name,
        class_name=class_name,
        semester=semester
    )

    total_count = len(results)

    offset_param = request.args.get('offset')
    limit_param = request.args.get('limit')

    offset = 0
    limit = 1000

    if offset_param:
        try:
            offset = max(0, int(offset_param))
        except ValueError:
            offset = 0

    if limit_param:
        try:
            limit = max(1, int(limit_param))
        except ValueError:
            limit = 1000

    paged_data = results[offset:offset + limit]
    
    return jsonify({
        'count': total_count,
        'offset': offset,
        'limit': limit,
        'data': paged_data
    })


@app.route('/api/query-simulation', methods=['GET'])
def api_query_simulation():
    """Run query simulation on full cached dataset and return lightweight visualization payload."""
    ensure_data_loaded()

    student_id_param = request.args.get('student_id')
    full_name = request.args.get('full_name')
    class_name = request.args.get('class_name')
    semester = request.args.get('semester')

    student_id = None
    if student_id_param:
        try:
            student_id = int(student_id_param)
        except ValueError:
            pass

    full_name = full_name.strip() if isinstance(full_name, str) and full_name.strip() else None
    class_name = class_name.strip() if isinstance(class_name, str) and class_name.strip() else None
    semester = semester.strip() if isinstance(semester, str) and semester.strip() else None

    heap_result = _simulate_query_for_manager(
        'Heap', ORG_CACHE.get('Heap', []), student_id, full_name, class_name, semester
    )
    sequential_result = _simulate_query_for_manager(
        'Sequential', ORG_CACHE.get('Sequential', []), student_id, full_name, class_name, semester
    )
    clustering_result = _simulate_query_for_manager(
        'Clustering', ORG_CACHE.get('Clustering', []), student_id, full_name, class_name, semester
    )
    partitioning_result = _simulate_query_partitioning(
        student_id, full_name, class_name, semester
    )

    managers = {
        'Heap': heap_result,
        'Sequential': sequential_result,
        'Clustering': clustering_result,
        'Partitioning': partitioning_result,
    }

    any_match = any(m['matchesCount'] > 0 for m in managers.values())

    return jsonify({
        'filters': {
            'student_id': student_id,
            'full_name': full_name,
            'class_name': class_name,
            'semester': semester,
        },
        'anyMatch': any_match,
        'managers': managers
    })


@app.route('/api/insert', methods=['POST'])
def api_insert():
    """Persist one inserted student record into data files and memory caches."""
    ensure_data_loaded()

    payload = request.get_json(silent=True) or {}
    full_name = (payload.get('full_name') or '').strip()
    class_name = (payload.get('class_name') or '').strip()
    semester = (payload.get('semester') or '').strip()
    score_raw = payload.get('score', 0)

    if not full_name or not class_name or not semester:
        return jsonify({'error': 'Thiếu thông tin bắt buộc'}), 400

    try:
        score = float(score_raw)
    except (TypeError, ValueError):
        score = 0.0
    score = max(0.0, min(10.0, score))

    with DATA_LOCK:
        student_id = _next_student_id()
        _append_student_to_file(student_id, full_name, class_name)
        _append_enrollment_to_file(student_id, semester, score)

        inserted = {
            'student_id': student_id,
            'full_name': full_name,
            'class_name': class_name,
            'semester': semester,
            'score': score,
        }
        _insert_into_caches(inserted)

    return jsonify({'ok': True, 'record': inserted})


if __name__ == '__main__':
    load_data()
    print(f"Loaded {len(STUDENTS)} students and {len(ENROLLMENTS)} enrollments")
    print(f"Demo dataset size: {len(DEMO_DATASET)} records")
    app.run(host='127.0.0.1', port=8000, debug=False)
