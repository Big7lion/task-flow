import { Graph } from '@antv/x6';

Graph.registerNode(
  'diamond',
  {
    inherit: 'polygon',
    attrs: {
      body: {
        refPoints: '0,0 50,50 100,0 50,50',
      },
    },
  },
  true
);

import { Selection } from '@antv/x6-plugin-selection';
import { Clipboard } from '@antv/x6-plugin-clipboard';
import { Keyboard } from '@antv/x6-plugin-keyboard';
import { Dnd } from '@antv/x6-plugin-dnd';
import { Export } from '@antv/x6-plugin-export';
import { History } from '@antv/x6-plugin-history';
import GUI from 'lil-gui';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker();
    }
    return new editorWorker();
  },
};

import * as monaco from 'monaco-editor';

const STORAGE_KEY = 'task-flow-presets';
const DRAFT_KEY = 'task-flow-preset-draft';
const CANVAS_DATA_KEY = 'task-flow-canvas-data';

class TaskFlowModule {
  constructor(containerId, options = {}) {
    this.options = {
      width: options.width || 1200,
      height: options.height || 800,
      ...options,
    };

    this.container = document.getElementById(containerId);
    this.canvasContainer = document.getElementById('canvas-container');
    this.presetList = document.getElementById('preset-list');
    this.guiContainer = document.getElementById('gui-container');

    this.presets = this.loadPresets();
    this.graph = null;
    this.gui = null;
    this.selectedNode = null;
    this.dnd = null;
    this.monacoEditor = null;

    this.init();
  }

  loadPresets() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : this.getDefaultPresets();
    } catch {
      return this.getDefaultPresets();
    }
  }

  savePresets() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.presets));
  }

  getDefaultPresets() {
    return [
      {
        id: 'start',
        name: 'Start Node',
        node: {
          shape: 'rect',
          width: 120,
          height: 40,
          attrs: {
            body: { fill: '#e6f7ff', stroke: '#1890ff', rx: 4, ry: 4 },
            text: { text: 'Start', fill: '#1890ff' },
          },
          config: [
            { label: 'Label', value: 'Start', type: 'string', key: 'label' },
            { label: 'Auto Start', value: true, type: 'boolean', key: 'autoStart' },
          ],
        },
      },
      {
        id: 'task',
        name: 'Task Node',
        node: {
          shape: 'rect',
          width: 140,
          height: 50,
          attrs: {
            body: { fill: '#fff7e6', stroke: '#fa8c16', rx: 4, ry: 4 },
            text: { text: 'Task', fill: '#fa8c16' },
          },
          config: [
            { label: 'Label', value: 'Task', type: 'string', key: 'label' },
            { label: 'Timeout (s)', value: 30, type: 'number', key: 'timeout', min: 0, max: 300 },
            { label: 'Retry Count', value: 3, type: 'number', key: 'retryCount', min: 0, max: 10 },
            { label: 'Required', value: true, type: 'boolean', key: 'required' },
            { label: 'Node Color', value: '#fa8c16', type: 'color', key: 'nodeColor' },
          ],
        },
      },
      {
        id: 'decision',
        name: 'Decision Node',
        node: {
          shape: 'diamond',
          width: 100,
          height: 60,
          attrs: {
            body: { fill: '#f6ffed', stroke: '#52c41a', rx: 4, ry: 4 },
            text: { text: 'Check', fill: '#52c41a' },
          },
          config: [
            { label: 'Label', value: 'Check', type: 'string', key: 'label' },
            { label: 'Condition', value: '', type: 'string', key: 'condition' },
            { label: 'Default Path', value: 'true', type: 'string', key: 'defaultPath' },
            { label: 'Async Check', value: false, type: 'boolean', key: 'asyncCheck' },
          ],
        },
      },
      {
        id: 'end',
        name: 'End Node',
        node: {
          shape: 'rect',
          width: 120,
          height: 40,
          attrs: {
            body: { fill: '#fff1f0', stroke: '#ff4d4f', rx: 4, ry: 4 },
            text: { text: 'End', fill: '#ff4d4f' },
          },
          config: [
            { label: 'Label', value: 'End', type: 'string', key: 'label' },
            { label: 'Show Result', value: true, type: 'boolean', key: 'showResult' },
            { label: 'Log Output', value: false, type: 'boolean', key: 'logOutput' },
          ],
        },
      },
      {
        id: 'http',
        name: 'HTTP Request',
        node: {
          shape: 'rect',
          width: 160,
          height: 60,
          attrs: {
            body: { fill: '#f9f0ff', stroke: '#722ed1', rx: 4, ry: 4 },
            text: { text: 'HTTP Request', fill: '#722ed1' },
          },
          config: [
            { label: 'Label', value: 'HTTP Request', type: 'string', key: 'label' },
            { label: 'Method', value: 'GET', type: 'string', key: 'method' },
            { label: 'URL', value: 'https://api.example.com', type: 'string', key: 'url' },
            { label: 'Timeout (ms)', value: 5000, type: 'number', key: 'timeout', min: 1000, max: 30000 },
            { label: 'Retry on Fail', value: true, type: 'boolean', key: 'retryOnFail' },
          ],
        },
      },
      {
        id: 'delay',
        name: 'Delay Node',
        node: {
          shape: 'rect',
          width: 120,
          height: 40,
          attrs: {
            body: { fill: '#f0f5ff', stroke: '#2f54eb', rx: 4, ry: 4 },
            text: { text: 'Delay', fill: '#2f54eb' },
          },
          config: [
            { label: 'Label', value: 'Delay', type: 'string', key: 'label' },
            { label: 'Duration (ms)', value: 1000, type: 'number', key: 'duration', min: 100, max: 60000 },
          ],
        },
      },
    ];
  }

  init() {
    this.initGraph();
    this.initGUI();
    this.initPresetPanel();
    this.initModal();
    this.initKeyboard();
    this.resizeCanvas();
    this.initAutoSave();
    this.loadCanvasData();
    window.addEventListener('resize', this.throttle(this.resizeCanvas.bind(this), 100));
  }

  initAutoSave() {
    const saveData = this.throttle(() => {
      const data = this.graph.toJSON();
      localStorage.setItem(CANVAS_DATA_KEY, JSON.stringify(data));
    }, 500);

    this.graph.on('node:added', saveData);
    this.graph.on('node:removed', saveData);
    this.graph.on('edge:added', saveData);
    this.graph.on('edge:removed', saveData);
    this.graph.on('node:moved', saveData);
    this.graph.on('node:resized', saveData);
    this.graph.on('edge:connected', saveData);
  }

  loadCanvasData() {
    try {
      const stored = localStorage.getItem(CANVAS_DATA_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.cells && data.cells.length > 0) {
          this.graph.fromJSON(data);
        }
      }
    } catch (err) {
      console.error('Failed to load canvas data:', err);
    }
  }

  initGraph() {
    const { width, height } = this.canvasContainer.getBoundingClientRect();

    this.graph = new Graph({
      container: this.canvasContainer,
      width: width || this.options.width,
      height: height || this.options.height,
      panning: true,
      mousewheel: {
        enabled: true,
        minScale: 0.3,
        maxScale: 3,
      },
      selecting: {
        enabled: true,
        showNodeSelectionBox: true,
        showEdgeSelectionBox: true,
      },
      clipboard: {
        enabled: true,
      },
      keyboard: {
        enabled: true,
      },
      history: {
        enabled: true,
      },
    });

    this.graph.use(
      new Selection({
        enabled: true,
        showNodeSelectionBox: true,
        showEdgeSelectionBox: true,
      })
    );

    this.graph.use(new Clipboard({ enabled: true }));
    this.graph.use(new Keyboard({ enabled: true }));
    this.graph.use(new Export());
    this.graph.use(new History({ enabled: true }));

    this.dnd = new Dnd({
      target: this.graph,
    });

    this.graph.on('selection:changed', this.handleSelectionChange.bind(this));

    this.graph.on('node:click', ({ node }) => {
      this.graph.select(node);
    });
  }

  initGUI() {
    this.rebuildGUI();
  }

  rebuildGUI() {
    this.guiContainer.innerHTML = '';

    this.gui = new GUI({ container: this.guiContainer, title: 'Node Config', width: 280 });

    this.saveButton = { save: () => console.log('Save clicked') };
    this.validateButton = { validate: () => console.log('Validate clicked') };
    this.exportButton = { exportImage: () => this.exportAsImage() };
    this.clearButton = { clearPage: () => this.clearCanvas() };

    this.gui.add(this.saveButton, 'save').name('Save');
    this.gui.add(this.validateButton, 'validate').name('Validate');
    this.gui.add(this.exportButton, 'exportImage').name('Export as Image');
    this.gui.add(this.clearButton, 'clearPage').name('Clear Page');
  }

  clearCanvas() {
    if (confirm('Are you sure you want to clear all nodes and edges?')) {
      this.graph.clearCells();
      localStorage.removeItem(CANVAS_DATA_KEY);
    }
  }

  destroyGUI() {
    if (this.gui) {
      this.gui.domElement.parentElement?.remove();
      this.gui = null;
    }
  }

  initPresetPanel() {
    this.renderPresets();

    document.getElementById('add-preset-btn').addEventListener('click', () => {
      this.openModal();
    });
  }

  renderPresets() {
    this.presetList.innerHTML = '';

    this.presets.forEach((preset) => {
      const item = document.createElement('div');
      item.className = 'preset-item';
      item.draggable = true;
      item.dataset.presetId = preset.id;

      item.innerHTML = `
        <div class="preset-item-name">${preset.name}</div>
        <div class="preset-item-preview">${preset.node.shape || 'rect'}</div>
        <button class="preset-item-delete" title="Delete">×</button>
      `;

      item.querySelector('.preset-item-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        this.deletePreset(preset.id);
      });

      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('preset', JSON.stringify(preset));
        e.dataTransfer.effectAllowed = 'copy';
      });

      this.presetList.appendChild(item);
    });

    this.canvasContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    this.canvasContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      try {
        const preset = JSON.parse(e.dataTransfer.getData('preset'));
        const rect = this.canvasContainer.getBoundingClientRect();
        const position = this.graph.snapToGrid({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        this.addNodeFromPreset(preset, position);
      } catch (err) {
        console.error('Failed to add node:', err);
      }
    });
  }

  addNodeFromPreset(preset, position) {
    const nodeConfig = { ...preset.node };
    nodeConfig.x = position.x;
    nodeConfig.y = position.y;

    const configData = preset.node.config || [];
    nodeConfig.data = {
      config: configData.map(c => ({ ...c }))
    };

    const node = this.graph.addNode(nodeConfig);
    this.graph.select(node);
    return node;
  }

  deletePreset(id) {
    this.presets = this.presets.filter((p) => p.id !== id);
    this.savePresets();
    this.renderPresets();
  }

  handleSelectionChange() {
    const selected = this.graph.getSelectedCells();

    if (selected.length === 1 && selected[0].isNode()) {
      const node = selected[0];
      this.selectedNode = node;
      this.showNodeConfig(node);
    } else {
      this.selectedNode = null;
      this.clearNodeConfig();
    }
  }

  showNodeConfig(node) {
    this.rebuildGUI();

    const config = node.getData()?.config || [];
    if (!config || config.length === 0) {
      return;
    }

    config.forEach((item) => {
      if (item.key) {
        this.createGUIController(item, node);
      }
    });

    this.gui.open();
  }

  createGUIController(item, node) {
    const value = item.value ?? '';
    const obj = { [item.key]: value };

    if (item.type === 'number') {
      this.gui.add(obj, item.key, item.min ?? 0, item.max ?? 100).name(item.label ?? item.key).onChange((newValue) => {
        this.updateNodeConfig(node, item.key, newValue);
      });
    } else if (item.type === 'boolean') {
      this.gui.add(obj, item.key).name(item.label ?? item.key).onChange((newValue) => {
        this.updateNodeConfig(node, item.key, newValue);
      });
    } else if (item.type === 'color') {
      this.gui.addColor(obj, item.key).name(item.label ?? item.key).onChange((newValue) => {
        this.updateNodeConfig(node, item.key, newValue);
      });
    } else {
      this.gui.add(obj, item.key).name(item.label ?? item.key).onChange((newValue) => {
        this.updateNodeConfig(node, item.key, newValue);
      });
    }
  }

  updateNodeConfig(node, key, value) {
    const data = node.getData() || { config: [] };
    const configItem = data.config.find((c) => c.key === key);

    if (configItem) {
      configItem.value = value;
    }

    if (key === 'label' || key === 'text') {
      const textAttr = node.attr('text');
      if (textAttr) {
        node.attr('text', { ...textAttr, text: value });
      }
    }

    node.setData(data);
  }

  clearNodeConfig() {
    this.rebuildGUI();
  }

  initKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        const selected = this.graph.getSelectedCells();
        if (selected.length > 0 && selected.every((c) => c.isNode())) {
          this.saveAsPreset(selected);
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selected = this.graph.getSelectedCells();
        if (selected.length > 0) {
          this.graph.removeCells(selected);
        }
      }
    });
  }

  saveAsPreset(cells) {
    // eslint-disable-next-line no-unused-vars
    const nodes = cells.map((cell) => cell.toJSON());

    const presetNode = {
      shape: 'rect',
      width: 120,
      height: 40,
      attrs: {
        body: { fill: '#f5f5f5', stroke: '#999', rx: 4, ry: 4 },
        text: { text: 'New Node', fill: '#333' },
      },
      config: [
        { label: 'Label', value: 'New Node', type: 'string', key: 'label' },
      ],
    };

    const preset = {
      id: `preset-${Date.now()}`,
      name: `Custom Node ${this.presets.length + 1}`,
      node: presetNode,
    };

    this.presets.push(preset);
    this.savePresets();
    this.renderPresets();
  }

  initModal() {
    this.modal = document.getElementById('preset-modal');
    this.modalOverlay = this.modal.querySelector('.modal-overlay');
    this.modalClose = document.getElementById('modal-close');
    this.modalCancel = document.getElementById('modal-cancel');
    this.modalSave = document.getElementById('modal-save');

    this.modalOverlay.addEventListener('click', () => this.closeModal());
    this.modalClose.addEventListener('click', () => this.closeModal());
    this.modalCancel.addEventListener('click', () => this.closeModal());
    this.modalSave.addEventListener('click', () => this.saveFromModal());
  }

  openModal() {
    const draft = localStorage.getItem(DRAFT_KEY);
    const initialValue = draft || JSON.stringify(
      {
        name: 'Custom Node',
        node: {
          shape: 'rect',
          width: 120,
          height: 40,
          attrs: {
            body: { fill: '#f5f5f5', stroke: '#999', rx: 4, ry: 4 },
            text: { text: 'Node', fill: '#333' },
          },
          config: [
            { label: 'Label', value: 'Node', type: 'string', key: 'label' },
          ],
        },
      },
      null,
      2
    );

    this.modal.classList.add('active');

    this.$nextTick(() => {
      if (!this.monacoEditor) {
        this.monacoEditor = monaco.editor.create(document.getElementById('monaco-editor'), {
          value: initialValue,
          language: 'json',
          theme: 'vs',
          minimap: { enabled: false },
          automaticLayout: true,
          formatOnPaste: true,
          formatOnType: true,
        });
      } else {
        this.monacoEditor.setValue(initialValue);
      }
    });
  }

  $nextTick(fn) {
    setTimeout(fn, 0);
  }

  closeModal() {
    const value = this.monacoEditor?.getValue();
    if (value) {
      localStorage.setItem(DRAFT_KEY, value);
    }
    this.modal.classList.remove('active');
  }

  saveFromModal() {
    try {
      const value = this.monacoEditor.getValue();
      const preset = JSON.parse(value);

      if (!preset.name || !preset.node) {
        throw new Error('Invalid preset format');
      }

      preset.id = `preset-${Date.now()}`;
      this.presets.push(preset);
      this.savePresets();
      this.renderPresets();

      localStorage.removeItem(DRAFT_KEY);
      this.closeModal();
    } catch (err) {
      alert('Invalid JSON format: ' + err.message);
    }
  }

  resizeCanvas() {
    if (this.graph && this.canvasContainer) {
      const rect = this.canvasContainer.getBoundingClientRect();
      this.graph.resize(rect.width, rect.height);
    }
  }

  throttle(fn, delay) {
    let lastCall = 0;
    return (...args) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        fn(...args);
      }
    };
  }

  exportAsImage() {
    if (this.graph) {
      this.graph.toPNG(
        (dataUri) => {
          const link = document.createElement('a');
          link.download = 'task-flow.png';
          link.href = dataUri;
          link.click();
        },
        {
          backgroundColor: '#ffffff',
          padding: 20,
        }
      );
    }
  }

  getGraph() {
    return this.graph;
  }

  getData() {
    return this.graph.toJSON();
  }

  setData(data) {
    if (data && data.cells) {
      this.graph.fromJSON(data);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.taskFlow = new TaskFlowModule('app', {
    width: window.innerWidth - 240,
    height: window.innerHeight,
  });
});

export { TaskFlowModule };
