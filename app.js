const BLOCK_CAPACITY = 5;
const MAX_VISIBLE_BLOCKS = 6;
const MANAGER_NAMES = ["Heap", "Sequential", "Clustering", "Partitioning"];
const SEQUENTIAL_FILL_PER_BLOCK = 4;

// Storage Classes
class BaseStorage {
  constructor(name, blockCapacity = BLOCK_CAPACITY) {
    this.name = name;
    this.blockCapacity = blockCapacity;
    this.records = [];
    this.lastBlocksRead = 0;
    this.lastExecutionTime = 0;
  }

  cloneRecord(record) {
    return { ...record };
  }

  packBlocks(records) {
    const blocks = [];
    for (let i = 0; i < records.length; i += this.blockCapacity) {
      blocks.push(records.slice(i, i + this.blockCapacity));
    }
    return blocks;
  }

  getBlockStatus() {
    return this.packBlocks(this.records);
  }

  measure(fn) {
    const start = performance.now();
    const value = fn();
    const elapsed = performance.now() - start;
    this.lastExecutionTime = Number(elapsed.toFixed(4));
    return value;
  }

  load(records) {
    this.measure(() => {
      this.records = records.map((record) => this.cloneRecord(record));
      this.lastBlocksRead = Math.max(1, Math.ceil(this.records.length / this.blockCapacity));
    });
    return this.buildOperationResult([], this.lastBlocksRead);
  }
}

class HeapFile extends BaseStorage {
  constructor(blockCapacity) {
    super("Heap", blockCapacity);
    this.blocks = [];
  }

  load(records) {
    this.measure(() => {
      this.blocks = [];
      let currentBlock = [];
      const clonedRecords = records.map((record) => this.cloneRecord(record));
      
      for (const record of clonedRecords) {
        if (currentBlock.length >= this.blockCapacity) {
          this.blocks.push(currentBlock);
          currentBlock = [];
        }
        currentBlock.push(record);
      }
      if (currentBlock.length > 0) {
        while (currentBlock.length < this.blockCapacity) {
          currentBlock.push(null);
        }
        this.blocks.push(currentBlock);
      }
      
      for (let i = 0; i < this.blocks.length; i++) {
        if (Math.random() < 0.15) {
          const idx = Math.floor(Math.random() * this.blockCapacity);
          this.blocks[i][idx] = null;
        }
      }
      
      this.lastBlocksRead = this.blocks.length;
    });
    return this.buildOperationResult([], this.lastBlocksRead);
  }

  insert(record) {
    this.measure(() => {
      let inserted = false;
      let blocksReadCount = 0;
      for (let i = 0; i < this.blocks.length; i++) {
        blocksReadCount++;
        for (let j = 0; j < this.blocks[i].length; j++) {
          if (!this.blocks[i][j] || this.blocks[i][j].__empty) {
            this.blocks[i][j] = this.cloneRecord(record);
            inserted = true;
            break;
          }
        }
        if (inserted) break;
      }
      if (!inserted) {
        const newBlock = [this.cloneRecord(record)];
        while (newBlock.length < this.blockCapacity) newBlock.push(null);
        this.blocks.push(newBlock);
        blocksReadCount++;
      }
      this.lastBlocksRead = blocksReadCount;
    });
    return this.buildOperationResult([], this.lastBlocksRead);
  }

  getBlockStatus() {
    return this.blocks.map(block => ({ records: block }));
  }

  buildOperationResult(matches, blocksRead) {
    return {
      manager: this.name,
      blocks: this.getBlockStatus(),
      blocksRead,
      executionTime: this.lastExecutionTime,
      matches,
    };
  }
}

class SequentialFile extends BaseStorage {
  constructor(blockCapacity) {
    super("Sequential", blockCapacity);
  }

  insert(record) {
    this.measure(() => {
      this.records.push(this.cloneRecord(record));
      this.records.sort((a, b) => a.student_id - b.student_id);
      this.lastBlocksRead = Math.max(1, Math.ceil(this.records.length / this.blockCapacity));
    });
    return this.buildOperationResult([], this.lastBlocksRead);
  }

  load(records) {
    this.measure(() => {
      this.records = records.map((record) => this.cloneRecord(record));
      this.records.sort((a, b) => a.student_id - b.student_id);
      this.lastBlocksRead = Math.max(1, Math.ceil(this.records.length / this.blockCapacity));
    });
    return this.buildOperationResult([], this.lastBlocksRead);
  }

  buildOperationResult(matches, blocksRead) {
    return {
      manager: this.name,
      blocks: this.getBlockStatus(),
      blocksRead,
      executionTime: this.lastExecutionTime,
      matches,
    };
  }
}
class MultitableClustering extends BaseStorage {
  constructor(blockCapacity) {
    super("Clustering", blockCapacity);
    this.clusterOrder = ["K20A", "K20B", "K20C", "K21A", "K21B", "K21C", "K22A", "K22B", "K22C",
                          "K23A", "K23B", "K23C", "K24A", "K24B", "K24C", "K25A", "K25B", "K25C",
                          "K26A", "K26B", "K26C", "K27A", "K27B", "K27C", "K28A", "K28B", "K28C",
                          "K29A", "K29B", "K29C", "K30A", "K30B", "K30C", "K31A", "K31B", "K31C",
                          "K32A", "K32B", "K32C", "K33A", "K33B", "K33C", "K34A", "K34B", "K34C",
                          "K35A", "K35B", "K35C"];
  }

  normalizeClusters() {
    this.records.sort((a, b) => {
      const ai = this.clusterOrder.indexOf(a.class_name || "");
      const bi = this.clusterOrder.indexOf(b.class_name || "");
      return (ai - bi) || a.student_id - b.student_id;
    });
  }

  insert(record) {
    this.measure(() => {
      this.records.push(this.cloneRecord(record));
      this.normalizeClusters();
      this.lastBlocksRead = Math.max(1, Math.ceil(this.records.length / this.blockCapacity));
    });
    return this.buildOperationResult([], this.lastBlocksRead);
  }

  load(records) {
    this.measure(() => {
      this.records = records.map((record) => this.cloneRecord(record));
      this.normalizeClusters();
      this.lastBlocksRead = Math.max(1, Math.ceil(this.records.length / this.blockCapacity));
    });
    return this.buildOperationResult([], this.lastBlocksRead);
  }

  buildOperationResult(matches, blocksRead) {
    return {
      manager: this.name,
      blocks: this.getBlockStatus(),
      blocksRead,
      executionTime: this.lastExecutionTime,
      matches,
    };
  }
}

class PartitioningFile extends BaseStorage {
  constructor(blockCapacity) {
    super("Partitioning", blockCapacity);
    this.partitions = {};
  }

  getPartitionKey(record) {
    return (record.semester || "UNKNOWN").trim() || "UNKNOWN";
  }

  recalcRecords() {
    const partitionKeys = Object.keys(this.partitions).sort();
    this.records = partitionKeys.flatMap((key) => this.partitions[key]);
  }

  getBlocksByPartition() {
    const result = {};
    for (const key of Object.keys(this.partitions).sort()) {
      result[key] = this.packBlocks(this.partitions[key]);
    }
    return result;
  }

  getBlockStatus() {
    const byPartition = this.getBlocksByPartition();
    const status = [];
    for (const key of Object.keys(byPartition)) {
      status.push(...byPartition[key].map((block) => ({ partition: key, records: block })));
    }
    return status;
  }

  insert(record) {
    this.measure(() => {
      const part = this.getPartitionKey(record);
      if (!this.partitions[part]) this.partitions[part] = [];
      this.partitions[part].push(this.cloneRecord(record));
      this.recalcRecords();
      this.lastBlocksRead = Math.max(1, Math.ceil(this.records.length / this.blockCapacity));
    });
    return this.buildOperationResult([], this.lastBlocksRead);
  }

  load(records) {
    this.measure(() => {
      this.partitions = {};
      records.forEach((record) => {
        const cloned = this.cloneRecord(record);
        const part = this.getPartitionKey(cloned);
        if (!this.partitions[part]) this.partitions[part] = [];
        this.partitions[part].push(cloned);
      });
      this.recalcRecords();
      this.lastBlocksRead = Math.max(1, Math.ceil(this.records.length / this.blockCapacity));
    });
    return this.buildOperationResult([], this.lastBlocksRead);
  }

  buildOperationResult(matches, blocksRead) {
    return {
      manager: this.name,
      blocks: this.getBlockStatus(),
      blocksRead,
      executionTime: this.lastExecutionTime,
      matches,
    };
  }
}

// App State
const appState = {
  demoDataset: [],
  totalRecords: 0,
  insertedCount: 0,
  insertManagers: createManagers(),
  stats: {
    Heap: {
      query: { hasData: false, studentsBlocksRead: null, enrollmentsBlocksRead: null, totalBlocksRead: null, totalTimeMs: null },
      insert: { hasData: false, studentsBlocksRead: null, enrollmentsBlocksRead: null, totalBlocksRead: null, totalTimeMs: null },
    },
    Sequential: {
      query: { hasData: false, studentsBlocksRead: null, enrollmentsBlocksRead: null, totalBlocksRead: null, totalTimeMs: null },
      insert: { hasData: false, studentsBlocksRead: null, enrollmentsBlocksRead: null, totalBlocksRead: null, totalTimeMs: null },
    },
    Clustering: {
      query: { hasData: false, studentsBlocksRead: null, enrollmentsBlocksRead: null, totalBlocksRead: null, totalTimeMs: null },
      insert: { hasData: false, studentsBlocksRead: null, enrollmentsBlocksRead: null, totalBlocksRead: null, totalTimeMs: null },
    },
    Partitioning: {
      query: { hasData: false, studentsBlocksRead: null, enrollmentsBlocksRead: null, totalBlocksRead: null, totalTimeMs: null },
      insert: { hasData: false, studentsBlocksRead: null, enrollmentsBlocksRead: null, totalBlocksRead: null, totalTimeMs: null },
    },
  },
};

function createManagers() {
  return {
    Heap: new HeapFile(BLOCK_CAPACITY),
    Sequential: new SequentialFile(BLOCK_CAPACITY),
    Clustering: new MultitableClustering(BLOCK_CAPACITY),
    Partitioning: new PartitioningFile(BLOCK_CAPACITY),
  };
}

function getRecordKey(record) {
  return [record.student_id, record.full_name, record.class_name, record.semester].join("|");
}

function buildTargetKeySet(records) {
  return new Set((records || []).map((r) => getRecordKey(r)));
}

// API Functions
async function loadDataset() {
  try {
    const response = await fetch('/api/dataset');
    const demoRecords = await response.json();
    appState.demoDataset = demoRecords || [];
    return appState.demoDataset;
  } catch (err) {
    console.error('Failed to load dataset:', err);
    return [];
  }
}

async function loadDataMeta() {
  try {
    const response = await fetch('/api/query?offset=0&limit=1');
    const payload = await response.json();
    appState.totalRecords = payload.count || 0;
  } catch (err) {
    appState.totalRecords = appState.demoDataset.length;
  }
}

function seedManagers() {
  const base = appState.demoDataset.map(x => ({ ...x }));
  const insertManagers = createManagers();
  MANAGER_NAMES.forEach((name) => {
    appState.insertManagers[name] = insertManagers[name];
    appState.insertManagers[name].load(base);
  });
}

function flattenBlockRecords(blocks) {
  return blocks.flatMap((block) => block.records || block);
}

function packSequentialWithFreeSlots(records) {
  const sorted = [...records].sort((a, b) => a.student_id - b.student_id);
  const blocks = [];
  for (let i = 0; i < sorted.length; i += SEQUENTIAL_FILL_PER_BLOCK) {
    blocks.push({
      blockNumber: blocks.length + 1,
      records: sorted.slice(i, i + SEQUENTIAL_FILL_PER_BLOCK),
    });
  }
  return blocks;
}

function renderInsertLogicNotes(notes) {
  const host = document.getElementById("insertLogicNotes");
  if (!host) return;
  host.innerHTML = notes.map((note) => `
    <div class="col-md-6 col-xl-3">
      <div class="metric-chip h-100">
        <strong>${note.manager}</strong>
        <div class="small text-secondary">${note.text}</div>
      </div>
    </div>
  `).join("");
}

function shorten(record) {
  return `SID:${record.student_id} | ${record.full_name} | ${record.class_name}`;
}

function renderBlocks(container, managerName, beforeBlocks, afterBlocks, options = {}) {
  const targetKeys = options.targetKeys || new Set();
  const blocksRead = typeof options.blocksRead === "number" ? options.blocksRead : null;
  const executionTime = typeof options.executionTime === "number" ? options.executionTime : null;
  const showStateLabel = Boolean(options.showStateLabel);
  const showEmptySlots = Boolean(options.showEmptySlots);
  const blockNumberOffset = options.blockNumberOffset || 0;
  const blocks = afterBlocks;

  let visibleStart = 0;
  if (blocks.length > MAX_VISIBLE_BLOCKS) {
    const firstTargetBlock = blocks.findIndex((block) => {
      const records = block.records || block;
      return records.some((r) => targetKeys.has(getRecordKey(r)));
    });

    if (firstTargetBlock >= 0) {
      visibleStart = Math.max(0, firstTargetBlock - Math.floor(MAX_VISIBLE_BLOCKS / 2));
      if (visibleStart + MAX_VISIBLE_BLOCKS > blocks.length) {
        visibleStart = Math.max(0, blocks.length - MAX_VISIBLE_BLOCKS);
      }
    }
  }

  const visibleBlocks = blocks.slice(visibleStart, visibleStart + MAX_VISIBLE_BLOCKS);

  const rows = visibleBlocks.map((block, localIdx) => {
    const idx = visibleStart + localIdx;
    const blockNumber = (block.blockNumber || (idx + 1)) + blockNumberOffset;
    const records = block.records || block;
    const partition = block.partition ? ` (${block.partition})` : "";

    const displayRecords = [...records];
    if (showEmptySlots) {
      while (displayRecords.length < BLOCK_CAPACITY) {
        displayRecords.push({ __empty: true });
      }
    }

    const pills = displayRecords
      .map((r) => {
        if (!r || r.__empty) {
          return '<div class="record-pill empty">(trống)</div>';
        }
        const isTarget = r.isTarget === true || targetKeys.has(getRecordKey(r));
        return `<div class="record-pill ${isTarget ? "target" : ""}">${shorten(r)}</div>`;
      })
      .join("");

    const beforeCount = (beforeBlocks[idx]?.records || beforeBlocks[idx] || []).length;
    const isAfterInsert = records.length > beforeCount;
    const titleSuffix = showStateLabel && isAfterInsert ? " • AFTER INSERT" : "";

    return `
      <div class="block ${isAfterInsert ? "block-after" : ""}">
        <div class="block-title">B${blockNumber}${partition}${titleSuffix}</div>
        ${pills || '<div class="record-pill">(empty)</div>'}
      </div>
    `;
  }).join("");

  const orgLabel =
    managerName === "Clustering"
      ? "Cluster theo class_name"
      : managerName === "Partitioning"
        ? "Partition theo semester"
        : managerName === "Sequential"
          ? "Sắp xếp theo student_id"
          : "Heap file";

  container.innerHTML = `
    <div class="block-zone">
      <h4>${managerName}</h4>
      <div class="small text-secondary mb-2">${orgLabel}</div>
      <div class="small text-secondary mb-2">Blocks đọc: ${blocksRead ?? "-"} • Time: ${executionTime !== null ? executionTime.toFixed(4) : "-"} ms</div>
      <div class="block-grid">${rows}</div>
    </div>
  `;
}

function updateStatsFromQuery(result, queryInfo = {}) {
  const stats = appState.stats[result.manager].query;
  const totalBlocksInStudents = Math.max(1, Math.ceil((appState.totalRecords || 1) / BLOCK_CAPACITY));
  const studentsBlocks = queryInfo.studentId !== null ? 1 : totalBlocksInStudents;
  const enrollmentsBlocks = result.blocksRead;

  stats.hasData = true;
  stats.studentsBlocksRead = studentsBlocks;
  stats.enrollmentsBlocksRead = enrollmentsBlocks;
  stats.totalBlocksRead = studentsBlocks + enrollmentsBlocks;
  stats.totalTimeMs = result.executionTime;
}

function updateStatsFromInsert(name, blocksRead, executionTime) {
  const stats = appState.stats[name].insert;

  const studentsBlocks = 1;
  const enrollmentsBlocks = blocksRead;

  stats.hasData = true;
  stats.studentsBlocksRead = studentsBlocks;
  stats.enrollmentsBlocksRead = enrollmentsBlocks;
  stats.totalBlocksRead = studentsBlocks + enrollmentsBlocks;
  stats.totalTimeMs = executionTime;
}

function formatNullableNumber(value, digits = 0) {
  if (value === null || value === undefined) return "null";
  return digits > 0 ? Number(value).toFixed(digits) : String(value);
}

function buildStatsRows(kind) {
  return MANAGER_NAMES.map((name) => {
    const s = appState.stats[name][kind];
    if (!s.hasData) {
      return `
        <tr>
          <td>${name}</td>
          <td>null</td>
          <td>null</td>
          <td>null</td>
          <td>null</td>
        </tr>
      `;
    }
    return `
      <tr>
        <td>${name}</td>
        <td>${formatNullableNumber(s.studentsBlocksRead)}</td>
        <td>${formatNullableNumber(s.enrollmentsBlocksRead)}</td>
        <td>${formatNullableNumber(s.totalBlocksRead)}</td>
        <td>${formatNullableNumber(s.totalTimeMs, 4)}</td>
      </tr>
    `;
  }).join("");
}

function renderDashboardTables() {
  const queryBody = document.getElementById("queryStatsBody");
  const insertBody = document.getElementById("insertStatsBody");
  if (!queryBody || !insertBody) return;

  queryBody.innerHTML = buildStatsRows("query");
  insertBody.innerHTML = buildStatsRows("insert");
}

function refreshDashboard() {
  renderDashboardTables();
}

// Event Handlers
async function handleQueryBtn() {
  const queryBtn = document.getElementById("queryBtn");
  if (queryBtn) queryBtn.disabled = true;
  const hint = document.getElementById("queryHint");

  try {
    const studentId = document.getElementById("queryStudentId").value.trim();
    const fullName = document.getElementById("queryStudentName").value.trim();
    const className = document.getElementById("queryClassName").value;
    const semester = document.getElementById("querySemester").value;

    const parsedStudentId = /^\d+$/.test(studentId) ? Number(studentId) : null;
    const activeQuery = {
      studentId: parsedStudentId,
      fullName: fullName || null,
      className: className || null,
      semester: semester || null,
    };

    const containers = document.getElementById("queryVisualContainers");
    containers.innerHTML = "";

    const params = new URLSearchParams();
    if (activeQuery.studentId !== null) params.append("student_id", String(activeQuery.studentId));
    if (activeQuery.fullName) params.append("full_name", activeQuery.fullName);
    if (activeQuery.className) params.append("class_name", activeQuery.className);
    if (activeQuery.semester) params.append("semester", activeQuery.semester);

    const response = await fetch(`/api/query-simulation?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Query simulation API failed with status ${response.status}`);
    }
    const payload = await response.json();

    const queryResults = payload.managers || {};
    const anyMatch = Boolean(payload.anyMatch);

    if (hint) {
      if (anyMatch) {
        hint.textContent = "Bản ghi khớp đã được tô xanh trong dữ liệu thật.";
      } else {
        hint.textContent = activeQuery.studentId !== null
          ? `Khong tim thay sinh vien ID ${activeQuery.studentId} trong du lieu.`
          : "Không tìm thấy bản ghi thỏa điều kiện trong dữ liệu hiện có.";
      }
    }

    MANAGER_NAMES.forEach((name) => {
      const col = document.createElement("div");
      col.className = "col-lg-6";
      const result = queryResults[name] || {
        manager: name,
        blocksRead: 0,
        executionTime: 0,
        totalBlocks: 0,
        blocks: [],
      };
      const blocks = result.blocks || [];
      renderBlocks(col, name, blocks, blocks, {
        blocksRead: result.blocksRead,
        executionTime: result.executionTime,
      });
      containers.appendChild(col);
      updateStatsFromQuery({ ...result, manager: name }, activeQuery);
    });

    refreshDashboard();
  } catch (err) {
    console.error("Query failed:", err);
    if (hint) {
      hint.textContent = "Khong the truy van du lieu that luc nay. Hay restart server va thu lai.";
    }
  } finally {
    if (queryBtn) queryBtn.disabled = false;
  }
}

async function handleInsertBtn() {
  const name = document.getElementById("insertStudentName").value.trim();
  const className = document.getElementById("insertClassName").value;
  const semester = document.getElementById("insertSemester").value;
  const insertBtn = document.getElementById("insertBtn");

  if (!name || !className || !semester) {
    alert("Vui lòng điền đầy đủ thông tin!");
    return;
  }

  if (insertBtn) insertBtn.disabled = true;

  let newRecord;
  try {
    const response = await fetch('/api/insert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: name,
        class_name: className,
        semester: semester,
        score: Math.random() * 10,
      }),
    });

    if (!response.ok) {
      throw new Error(`Insert API failed: ${response.status}`);
    }

    const payload = await response.json();
    newRecord = payload.record;
  } catch (err) {
    console.error('Insert failed:', err);
    alert('Không thể lưu bản ghi vào dữ liệu thật. Vui lòng thử lại.');
    if (insertBtn) insertBtn.disabled = false;
    return;
  }

  try {
    const logicNotes = [];
    const recordCountAfterInsert = appState.totalRecords + appState.insertedCount + 1;

    MANAGER_NAMES.forEach((name) => {
      const manager = appState.insertManagers[name];
      const before = manager.getBlockStatus().map((b) => (b.records ? { partition: b.partition, records: [...b.records] } : [...b]));
      const result = manager.insert(newRecord);
      let blocks = result.blocks;
      let beforeDisplay = before;
      let afterDisplay = blocks;
      let displayBlocksRead = result.blocksRead;
      let noteText = "";

    if (name === "Sequential") {
      const beforeRecords = flattenBlockRecords(before);
      const afterRecords = flattenBlockRecords(blocks);
      beforeDisplay = packSequentialWithFreeSlots(beforeRecords);
      afterDisplay = packSequentialWithFreeSlots(afterRecords);
      const insertIdx = afterRecords.findIndex((r) => r.student_id === newRecord.student_id);
      const startBlock = insertIdx >= 0 ? Math.floor(insertIdx / SEQUENTIAL_FILL_PER_BLOCK) : 0;
      displayBlocksRead = Math.max(1, afterDisplay.length - startBlock);
      noteText = "Chèn theo student_id tăng dần; có slot trống trong block để giảm dịch chuyển bản ghi.";
    } else if (name === "Heap") {
      noteText = "Chèn vào ô trống đầu tiên tìm thấy (do giả lập có bản ghi bị xóa). Nếu đầy, tạo block mới.";
    } else if (name === "Clustering") {
      noteText = "Chèn vào nhóm class_name tương ứng, giữ dữ liệu cùng lớp gần nhau.";
    } else if (name === "Partitioning") {
      noteText = "Chèn vào partition theo semester của bản ghi mới, không ảnh hưởng partition khác.";
    }

    const effectiveSlots = name === "Sequential" ? SEQUENTIAL_FILL_PER_BLOCK : BLOCK_CAPACITY;
    const estimatedTotalBlocks = Math.max(1, Math.ceil(recordCountAfterInsert / effectiveSlots));
    const blockNumberOffset = Math.max(0, estimatedTotalBlocks - afterDisplay.length);

      logicNotes.push({ manager: name, text: noteText });
      const targetKeys = buildTargetKeySet([newRecord]);
      const host = document.getElementById("insertVisualContainers");
      let col = host.querySelector(`[data-manager="${name}"]`);
      if (!col) {
        col = document.createElement("div");
        col.className = "col-lg-6";
        col.setAttribute("data-manager", name);
        host.appendChild(col);
      }
      renderBlocks(col, name, beforeDisplay, afterDisplay, {
        targetKeys,
        blocksRead: displayBlocksRead,
        executionTime: result.executionTime,
        showStateLabel: true,
        showEmptySlots: name === "Sequential" || name === "Heap",
        blockNumberOffset,
      });

      updateStatsFromInsert(name, displayBlocksRead, result.executionTime);
    });

    renderInsertLogicNotes(logicNotes);
    appState.insertedCount += 1;
    refreshDashboard();
  } finally {
    if (insertBtn) insertBtn.disabled = false;
  }
}

async function init() {
  await loadDataset();
  await loadDataMeta();
  seedManagers();

  document.getElementById("queryBtn").addEventListener("click", () => {
    handleQueryBtn();
  });
  document.getElementById("insertBtn").addEventListener("click", () => {
    handleInsertBtn();
  });

  refreshDashboard();
}

window.addEventListener("DOMContentLoaded", init);

