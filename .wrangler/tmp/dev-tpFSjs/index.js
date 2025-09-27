var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../Library/pnpm/global/5/.pnpm/unenv@2.0.0-rc.21/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// ../../Library/pnpm/global/5/.pnpm/unenv@2.0.0-rc.21/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// ../../Library/pnpm/global/5/.pnpm/@cloudflare+unenv-preset@2.7.4_unenv@2.0.0-rc.21_workerd@1.20250924.0/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// ../../Library/pnpm/global/5/.pnpm/unenv@2.0.0-rc.21/node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// ../../Library/pnpm/global/5/.pnpm/unenv@2.0.0-rc.21/node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// ../../Library/pnpm/global/5/.pnpm/unenv@2.0.0-rc.21/node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// ../../Library/pnpm/global/5/.pnpm/@cloudflare+unenv-preset@2.7.4_unenv@2.0.0-rc.21_workerd@1.20250924.0/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// ../../Library/pnpm/global/5/.pnpm/wrangler@4.40.1/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// ../../Library/pnpm/global/5/.pnpm/unenv@2.0.0-rc.21/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// ../../Library/pnpm/global/5/.pnpm/unenv@2.0.0-rc.21/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// ../../Library/pnpm/global/5/.pnpm/unenv@2.0.0-rc.21/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// ../../Library/pnpm/global/5/.pnpm/unenv@2.0.0-rc.21/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// ../../Library/pnpm/global/5/.pnpm/unenv@2.0.0-rc.21/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// ../../Library/pnpm/global/5/.pnpm/unenv@2.0.0-rc.21/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// ../../Library/pnpm/global/5/.pnpm/@cloudflare+unenv-preset@2.7.4_unenv@2.0.0-rc.21_workerd@1.20250924.0/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var isWorkerdProcessV2 = globalThis.Cloudflare.compatibilityFlags.enable_nodejs_process_v2;
var unenvProcess = new Process({
  env: globalProcess.env,
  // `hrtime` is only available from workerd process v2
  hrtime: isWorkerdProcessV2 ? workerdProcess.hrtime : hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  // Always implemented by workerd
  env,
  // Only implemented in workerd v2
  hrtime: hrtime3,
  // Always implemented by workerd
  nextTick
} = unenvProcess;
var {
  _channel,
  _disconnect,
  _events,
  _eventsCount,
  _handleQueue,
  _maxListeners,
  _pendingMessage,
  _send,
  assert: assert2,
  disconnect,
  mainModule
} = unenvProcess;
var {
  // @ts-expect-error `_debugEnd` is missing typings
  _debugEnd,
  // @ts-expect-error `_debugProcess` is missing typings
  _debugProcess,
  // @ts-expect-error `_exiting` is missing typings
  _exiting,
  // @ts-expect-error `_fatalException` is missing typings
  _fatalException,
  // @ts-expect-error `_getActiveHandles` is missing typings
  _getActiveHandles,
  // @ts-expect-error `_getActiveRequests` is missing typings
  _getActiveRequests,
  // @ts-expect-error `_kill` is missing typings
  _kill,
  // @ts-expect-error `_linkedBinding` is missing typings
  _linkedBinding,
  // @ts-expect-error `_preload_modules` is missing typings
  _preload_modules,
  // @ts-expect-error `_rawDebug` is missing typings
  _rawDebug,
  // @ts-expect-error `_startProfilerIdleNotifier` is missing typings
  _startProfilerIdleNotifier,
  // @ts-expect-error `_stopProfilerIdleNotifier` is missing typings
  _stopProfilerIdleNotifier,
  // @ts-expect-error `_tickCallback` is missing typings
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  availableMemory,
  // @ts-expect-error `binding` is missing typings
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  // @ts-expect-error `domain` is missing typings
  domain,
  emit,
  emitWarning,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  // @ts-expect-error `initgroups` is missing typings
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  memoryUsage,
  // @ts-expect-error `moduleLoadList` is missing typings
  moduleLoadList,
  off,
  on,
  once,
  // @ts-expect-error `openStdin` is missing typings
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  // @ts-expect-error `reallyExit` is missing typings
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = isWorkerdProcessV2 ? workerdProcess : unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// ../../Library/pnpm/global/5/.pnpm/wrangler@4.40.1/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// api/chat.ts
var MAX_HISTORY_PAIRS = 12;
var MAX_CONTEXT_DOCS = 4;
var MAX_TOKENS_REPLY = 512;
var DEFAULT_MODEL = "gpt-4o-mini";
var DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
}
__name(json, "json");
function shortId() {
  return Math.random().toString(36).slice(2, 10);
}
__name(shortId, "shortId");
async function parseJSON(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
__name(parseJSON, "parseJSON");
async function rateLimit(env2, session, ip) {
  if (!env2.PAINTER_KV) return;
  const key = `rl:${session || ip || "anon"}`;
  const raw = await env2.PAINTER_KV.get(key);
  const count3 = raw ? parseInt(raw, 10) : 0;
  if (count3 > 40) throw new Error("rate_limited");
  await env2.PAINTER_KV.put(key, String(count3 + 1), { expirationTtl: 300 });
}
__name(rateLimit, "rateLimit");
async function fetchHistory(env2, session) {
  try {
    const { results } = await env2.DB.prepare(
      `SELECT question, answer FROM chat_log WHERE session = ? ORDER BY id DESC LIMIT ?`
    ).bind(session, MAX_HISTORY_PAIRS).all();
    return (results || []).reverse();
  } catch {
    return [];
  }
}
__name(fetchHistory, "fetchHistory");
function buildHistoryMessages(history) {
  const msgs = [];
  for (const row of history) {
    if (row.question) msgs.push({ role: "user", content: row.question });
    if (row.answer) msgs.push({ role: "assistant", content: row.answer });
  }
  return msgs;
}
__name(buildHistoryMessages, "buildHistoryMessages");
async function retrieveDocs(env2, userMsg) {
  if (!env2.VECTORIZE || !env2.AI) return [];
  try {
    const embeddingResp = await env2.AI.run("@cf/baai/bge-small-en-v1.5", { text: userMsg });
    const vector = embeddingResp?.data?.[0]?.embedding || embeddingResp?.embedding || [];
    if (!Array.isArray(vector) || !vector.length) return [];
    const queryResp = await env2.VECTORIZE.query(vector, { topK: MAX_CONTEXT_DOCS, returnValues: true });
    const docs = (queryResp.matches || []).map((m, i) => ({
      id: m.id || String(i),
      score: m.score,
      text: (m.values?.text || m.metadata?.text || "").toString().slice(0, 1200)
    })).filter((d) => d.text);
    return docs;
  } catch (e) {
    return [];
  }
}
__name(retrieveDocs, "retrieveDocs");
function classifyIntent(text) {
  const lower = text.toLowerCase();
  return {
    wantsEstimate: /estimate|quote|cost|price/.test(lower),
    scheduling: /schedule|when can|availability|book/.test(lower),
    greeting: /^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(lower),
    farewell: /(bye|thank you|thanks)/.test(lower)
  };
}
__name(classifyIntent, "classifyIntent");
function systemPrompt(env2) {
  return `You are Paint Guru, the expert, professional painting consultant for Dependable Painting (Baldwin & Mobile County, Alabama).
MANDATES:
- Be accurate, concise, friendly, and professional.
- Only answer about painting, surfaces, coatings, preparation, tools, safety, scheduling guidance.
- Allowed topics ONLY: painting techniques, surface prep, coatings, primers, Sherwin-Williams products (general characteristics, appropriate uses), our services, service areas, scheduling expectations, seasonal considerations (humidity, UV, salt air), safety & cleanup.
- Disallowed: precise pricing numbers, unrelated trades, legal/medical/financial topics, unrelated home improvement outside painting context. Politely redirect if outside scope.
- If user requests a quote or pricing, DO NOT provide exact prices or line-item costs. Instead outline factors (prep, substrate, square footage, coatings) and suggest a free in-person estimate by calling (251) 423-5855.
- NEVER invent company data. If unsure, admit uncertainty and offer a human follow-up.
- Localize examples to Gulf Coast climate (humidity, UV, salt air) when relevant.
- Cite retrieved context snippets as [Doc #] when used.
- Encourage surface preparation best practices.
- Always end with a concise CTA: "Call (251) 423-5855 for a fast, accurate estimate" OR suggest a relevant internal page (e.g. /interior-painting.html, /exterior-painting.html, /cabinet-painting.html, /commercial-painting.html, /contact-form.html) depending on user intent.
OUTPUT STYLE:
- Short paragraphs (2-4 sentences) or lists.
- Provide actionable steps when user asks how.
- End with a helpful invitation if appropriate.`;
}
__name(systemPrompt, "systemPrompt");
function buildContextBlock(docs) {
  if (!docs.length) return "";
  return "Retrieved Context:\n" + docs.map((d, i) => `[Doc ${i + 1}] ${d.text}`).join("\n---\n");
}
__name(buildContextBlock, "buildContextBlock");
async function callWorkersAI(env2, messages, temperature) {
  const resp = await env2.AI.run({
    model: env2.AI_MODEL || DEFAULT_MODEL,
    messages,
    max_tokens: MAX_TOKENS_REPLY,
    temperature
  });
  return { text: resp?.choices?.[0]?.message?.content || "", provider: "workers-ai" };
}
__name(callWorkersAI, "callWorkersAI");
async function callOpenAI(env2, messages, temperature) {
  const apiKey = env2.OPENAI_API_KEY;
  if (!apiKey) throw new Error("openai_missing");
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env2.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      messages,
      temperature,
      max_tokens: MAX_TOKENS_REPLY
    })
  });
  if (!resp.ok) {
    const tx = await resp.text().catch(() => "");
    throw new Error(`openai_http_${resp.status}:${tx.slice(0, 200)}`);
  }
  const data = await resp.json();
  return { text: data?.choices?.[0]?.message?.content || "", provider: "openai" };
}
__name(callOpenAI, "callOpenAI");
async function persist(env2, session, question, answer, provider, page, ua) {
  try {
    await env2.DB.prepare(
      "INSERT INTO chat_log (ts, session, question, answer, ai_provider, user_agent, page) VALUES (datetime('now'),?,?,?,?,?,?)"
    ).bind(session, question, answer, provider, ua, page || "").run();
  } catch {
  }
  try {
    if (env2.CHAT_QUEUE) {
      await env2.CHAT_QUEUE.send({ session, question, answer, provider, page, ts: Date.now() });
    }
  } catch {
  }
}
__name(persist, "persist");
function sseStream(text) {
  const encoder = new TextEncoder();
  const sentences = text.match(/[^.!?]+[.!?]?/g) || [text];
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i >= sentences.length) {
        controller.enqueue(encoder.encode("event: end\ndata: [DONE]\n\n"));
        controller.close();
        return;
      }
      const chunk = sentences[i++].trim();
      if (chunk) controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}

`));
    }
  });
}
__name(sseStream, "sseStream");
async function handleChat(env2, request) {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const body = await parseJSON(request);
  if (!body || !body.message) return json({ error: "message_required" }, 400);
  const session = (body.session || "").slice(0, 64) || shortId();
  const temperature = Number.isFinite(body.temperature) ? Number(body.temperature) : env2.AI_TEMP ? Number(env2.AI_TEMP) : 0.3;
  const ip = request.headers.get("CF-Connecting-IP");
  try {
    await rateLimit(env2, session, ip);
  } catch {
    return json({ error: "rate_limited" }, 429);
  }
  const historyRows = await fetchHistory(env2, session);
  const historyMsgs = buildHistoryMessages(historyRows);
  const docs = await retrieveDocs(env2, body.message);
  const intents = classifyIntent(body.message);
  const contextBlock = buildContextBlock(docs);
  const dynamicDirectives = [];
  if (intents.wantsEstimate) dynamicDirectives.push("User is seeking a cost/estimate: Provide realistic ballpark ranges & factors, then advise free on-site estimate (call (251) 423-5855).");
  if (intents.scheduling) dynamicDirectives.push("User intent: scheduling. Offer phone scheduling and typical lead times.");
  if (intents.greeting) dynamicDirectives.push("Acknowledge greeting briefly.");
  if (intents.farewell) dynamicDirectives.push("Offer a helpful closing, ask if they need anything else.");
  const dynamicBlock = dynamicDirectives.length ? "Dynamic Guidance:\n" + dynamicDirectives.join("\n") : "";
  const system = systemPrompt(env2) + (contextBlock ? "\n\n" + contextBlock : "") + (dynamicBlock ? "\n\n" + dynamicBlock : "");
  const messages = [
    { role: "system", content: system },
    ...historyMsgs,
    { role: "user", content: body.message }
  ];
  let aiResp = null;
  let error3 = null;
  try {
    if (env2.AI) {
      aiResp = await callWorkersAI(env2, messages, temperature);
    } else if (env2.OPENAI_API_KEY) {
      aiResp = await callOpenAI(env2, messages, temperature);
    } else {
      throw new Error("no_ai_provider");
    }
  } catch (e) {
    error3 = e?.message || String(e);
  }
  if (!aiResp) return json({ error: error3 || "ai_failed" }, 502);
  persist(env2, session, body.message, aiResp.text, aiResp.provider, body.page, request.headers.get("User-Agent"));
  if (body.stream) {
    const stream = sseStream(aiResp.text);
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Session": session
      }
    });
  }
  return json({
    ok: true,
    session,
    reply: aiResp.text,
    // Backwards compatibility for earlier widget expecting 'answer'
    answer: aiResp.text,
    provider: aiResp.provider,
    intents,
    used: {
      history_pairs: historyRows.length,
      context_docs: docs.length
    }
  });
}
__name(handleChat, "handleChat");

// api/track.ts
function j(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } });
}
__name(j, "j");
function safeNumber(n, d = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : d;
}
__name(safeNumber, "safeNumber");
function classifyChannel(b) {
  const src = (b.source || b.utm_source || "").toLowerCase();
  const med = (b.medium || b.utm_medium || "").toLowerCase();
  const ref2 = (b.referrer || "").toLowerCase();
  if (b.gclid) return { channel: "Paid Search", source: "google", medium: "cpc" };
  if (/facebook|fb\.com/.test(src) || /facebook|fb\.com/.test(ref2)) return { channel: "Paid Social", source: "facebook", medium: med || "paid_social" };
  if (/tiktok/.test(src) || /tiktok/.test(ref2)) return { channel: "Paid Social", source: "tiktok", medium: med || "paid_social" };
  if (/google/.test(src) && (med === "organic" || !med)) return { channel: "Organic Search", source: "google", medium: "organic" };
  if (/bing|yahoo|duckduckgo/.test(ref2)) return { channel: "Organic Search", source: "other_search", medium: "organic" };
  if (med === "email") return { channel: "Email", source: src || "email", medium: "email" };
  if (med === "affiliate") return { channel: "Affiliate", source: src || "affiliate", medium: "affiliate" };
  if (med === "cpc" || med === "ppc" || med === "paid_search") return { channel: "Paid Search", source: src || "paid", medium: "cpc" };
  if (ref2 && !ref2.includes("dependablepainting.work")) return { channel: "Referral", source: new URL("https://" + ref2.replace(/^https?:\/\//, "")).hostname.replace(/^www\./, "") || "referral", medium: "referral" };
  return { channel: "Direct", source: "direct", medium: "direct" };
}
__name(classifyChannel, "classifyChannel");
function isBot(ua) {
  if (!ua) return false;
  return /(bot|crawl|spider|slurp|headless|phantom|monitor)/i.test(ua) && !/chrome\/[\d.]+ safari\//i.test(ua);
}
__name(isBot, "isBot");
function inferFunnel(type, page) {
  const t = type.toLowerCase();
  if (t === "page_view") {
    if (/thank-you/.test(page)) return "Conversion";
    if (/contact|estimate|quote/.test(page)) return "Consideration";
    return "Awareness";
  }
  if (/form_submit|lead|conversion/.test(t)) return "Conversion";
  if (/scroll|engagement/.test(t)) return "Engagement";
  return "Other";
}
__name(inferFunnel, "inferFunnel");
async function rateLimitKV(kv, key, limit, windowSecs) {
  try {
    const nowBucket = Math.floor(Date.now() / (windowSecs * 1e3));
    const storageKey = `rt:${key}:${nowBucket}`;
    const current = await kv.get(storageKey);
    if (!current) {
      await kv.put(storageKey, "1", { expirationTtl: windowSecs + 5 });
      return true;
    }
    const next = parseInt(current, 10) + 1;
    if (next > limit) return false;
    await kv.put(storageKey, String(next), { expirationTtl: windowSecs + 5 });
    return true;
  } catch {
    return true;
  }
}
__name(rateLimitKV, "rateLimitKV");
async function persistEvent(env2, record) {
  try {
    await env2.DB.prepare(
      `INSERT INTO lead_events (ts, day, hour, type, page, service, source, device, city, country, zip, area, session, scroll_pct, duration_ms, referrer, utm_source, utm_medium, utm_campaign, gclid)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      record.ts,
      record.day,
      record.hour,
      record.type,
      record.page,
      record.service,
      record.source,
      record.device,
      record.city,
      record.country,
      record.zip,
      record.area,
      record.session,
      record.scroll_pct,
      record.duration_ms,
      record.referrer,
      record.utm_source,
      record.utm_medium,
      record.utm_campaign,
      record.gclid
    ).run();
  } catch (e) {
    console.error("D1 advanced event insert failed", e);
  }
}
__name(persistEvent, "persistEvent");
function buildDerived(record) {
  const funnel_stage = inferFunnel(record.type, record.page);
  return { funnel_stage };
}
__name(buildDerived, "buildDerived");
async function maybeAnalyticsEngine(env2, enriched) {
  if (!env2.ANALYTICS_EVENTS) return;
  try {
    await env2.ANALYTICS_EVENTS.writeDataPoint({
      indexes: [enriched.channel, enriched.funnel_stage, enriched.type],
      blobs: [JSON.stringify(enriched)],
      doubles: [enriched.value || 0]
    });
  } catch (e) {
  }
}
__name(maybeAnalyticsEngine, "maybeAnalyticsEngine");
async function fanOutQueues(env2, enriched) {
  try {
    if (env2.GA4_QUEUE) {
      await env2.GA4_QUEUE.send({
        type: enriched.type,
        page: enriched.page,
        session: enriched.session,
        city: enriched.city,
        service: enriched.service,
        source: enriched.source
      });
    }
  } catch (_) {
  }
}
__name(fanOutQueues, "fanOutQueues");
async function handleAdvancedTrack(env2, request) {
  const body = await request.json().catch(() => null);
  if (!body) return j({ error: "Invalid JSON" }, 400);
  const ua = request.headers.get("User-Agent");
  if (isBot(ua)) return j({ ok: true, skipped: "bot" });
  const session = (body.session || crypto.randomUUID()).toString().slice(0, 120);
  const allowed = await rateLimitKV(env2.PAINTER_KV, `adv:${session}`, 120, 60 * 5);
  if (!allowed) return j({ error: "rate_limited" }, 429);
  const tsDate = body.ts ? new Date(body.ts) : /* @__PURE__ */ new Date();
  const iso = tsDate.toISOString();
  const record = {
    ts: iso,
    day: iso.slice(0, 10),
    hour: iso.slice(11, 13),
    type: (body.type || "page_view").toString().slice(0, 60),
    page: (body.page || "").toString().slice(0, 300),
    service: (body.service || "").toString().slice(0, 120),
    source: (body.source || body.utm_source || "").toString().slice(0, 120),
    device: (body.device || "").toString().slice(0, 60),
    city: (body.city || "").toString().slice(0, 120),
    country: (body.country || "").toString().slice(0, 120),
    zip: (body.zip || "").toString().slice(0, 40),
    area: (body.area || "").toString().slice(0, 80),
    session,
    scroll_pct: safeNumber(body.scroll_pct),
    duration_ms: safeNumber(body.duration_ms),
    referrer: (body.referrer || "").toString().slice(0, 300),
    utm_source: (body.utm_source || "").toString().slice(0, 120),
    utm_medium: (body.utm_medium || "").toString().slice(0, 120),
    utm_campaign: (body.utm_campaign || "").toString().slice(0, 120),
    gclid: (body.gclid || "").toString().slice(0, 200)
  };
  const channelInfo = classifyChannel(body);
  const derived = buildDerived(record);
  const value = safeNumber(body.value, 0);
  const enriched = { ...record, ...channelInfo, ...derived, value, meta: body.meta || {}, ua };
  await persistEvent(env2, record);
  await maybeAnalyticsEngine(env2, enriched);
  await fanOutQueues(env2, enriched);
  return j({ ok: true, channel: channelInfo.channel, funnel_stage: derived.funnel_stage, value });
}
__name(handleAdvancedTrack, "handleAdvancedTrack");

// api/estimate.ts
function j2(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } });
}
__name(j2, "j");
function normalizePhone(raw) {
  if (!raw) return { raw: "", digits: "" };
  const digits = raw.replace(/\D+/g, "").slice(0, 15);
  return { raw: raw.trim(), digits };
}
__name(normalizePhone, "normalizePhone");
function riskScore(msg, body) {
  let score = 0;
  const reasons = [];
  const m = msg.toLowerCase();
  if (m.length < 5) {
    score += 10;
    reasons.push("very_short");
  }
  if (/https?:\/\//.test(m)) {
    score += 25;
    reasons.push("link_present");
  }
  if ((m.match(/free quote|seo|backlink|guest post/gi) || []).length) {
    score += 25;
    reasons.push("spam_keywords");
  }
  if (body.email && /@(example|test|mailinator|tempmail)/i.test(body.email)) {
    score += 15;
    reasons.push("throwaway_email");
  }
  return { score, reasons };
}
__name(riskScore, "riskScore");
async function findDuplicate(env2, phoneDigits, email, service, message) {
  try {
    if (!phoneDigits && !email) return false;
    const where = [];
    const args = [];
    if (phoneDigits) {
      where.push("phone LIKE ?");
      args.push("%" + phoneDigits.slice(-6));
    }
    if (email) {
      where.push("email = ?");
      args.push(email);
    }
    const clause = where.length ? "(" + where.join(" OR ") + ")" : "1=0";
    const q = `SELECT id FROM leads WHERE ${clause} AND service = ? AND message = ? LIMIT 1`;
    const row = await env2.DB.prepare(q).bind(...args, service || "", message).first();
    return !!row;
  } catch (_) {
    return false;
  }
}
__name(findDuplicate, "findDuplicate");
async function insertLead(env2, lead) {
  const res = await env2.DB.prepare(
    `INSERT INTO leads (name, email, phone, city, zip, service, page, session, source, message)
		 VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    lead.name,
    lead.email,
    lead.phone,
    lead.city,
    lead.zip,
    lead.service,
    lead.page,
    lead.session,
    lead.source,
    lead.message
  ).run();
  return res.meta?.last_row_id ? String(res.meta.last_row_id) : void 0;
}
__name(insertLead, "insertLead");
async function insertEvent(env2, lead) {
  try {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    await env2.DB.prepare(
      `INSERT INTO lead_events (ts, day, hour, type, page, service, source, device, city, country, zip, area, session, scroll_pct, duration_ms, referrer, utm_source, utm_medium, utm_campaign, gclid)
			 VALUES (?, date(?), strftime('%H', ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      ts,
      ts,
      ts,
      "form_submit",
      lead.page || "",
      lead.service || "",
      lead.source || "",
      "",
      // device
      lead.city || "",
      "",
      // country (not provided)
      lead.zip || "",
      "",
      // area
      lead.session || "",
      0,
      0,
      lead.referrer || "",
      lead.utm_source || "",
      lead.utm_medium || "",
      lead.utm_campaign || "",
      lead.gclid || ""
    ).run();
  } catch (_) {
  }
}
__name(insertEvent, "insertEvent");
async function sendAdminEmail(env2, lead, risk) {
  if (!env2.SEB || !env2.SEB.send) return;
  const subject = `[LEAD] ${lead.service || "General"} | ${lead.name} | ${lead.phone || lead.email || "no-contact"}`;
  const lines = [
    "New contact form submission:",
    `Name: ${lead.name}`,
    `Email: ${lead.email || "\u2014"}`,
    `Phone: ${lead.phone || "\u2014"}`,
    `City: ${lead.city || "\u2014"}`,
    `Zip: ${lead.zip || "\u2014"}`,
    `Service: ${lead.service || "\u2014"}`,
    `Source: ${lead.source || "\u2014"}`,
    `UTM: ${lead.utm_source || ""} / ${lead.utm_medium || ""} / ${lead.utm_campaign || ""}`,
    `Session: ${lead.session || "\u2014"}`,
    `Page: ${lead.page}`,
    `Referrer: ${lead.referrer || "\u2014"}`,
    `Message:
${lead.message}`,
    `Risk Score: ${risk.score} (${risk.reasons.join(",") || "clean"})`
  ];
  const text = lines.join("\n");
  const from = env2.FROM_ADDR || env2.SENDER || "no-reply@dependablepainting.work";
  const rawList = env2.LEAD_ALERTS || env2.ADMIN_EMAIL || env2.OWNER_EMAIL || env2.TO_ADDR || env2.DESTINATION;
  const toList = (rawList || "just-paint-it@dependablepainting.work").split(/[,;\s]+/).filter(Boolean);
  for (const to of toList) {
    try {
      if (typeof EmailMessage !== "undefined") {
        const msg = new EmailMessage(from, to, subject);
        msg.setBody("text/plain", text);
        await env2.SEB.send(msg);
      } else {
        await env2.SEB.send({ from, to, subject, content: text });
      }
    } catch (_) {
    }
  }
}
__name(sendAdminEmail, "sendAdminEmail");
async function queueCustomerAutoReply(env2, lead) {
  if (!lead.email) return;
  try {
    if (env2.LEAD_NOTIFY_QUEUE) {
      const subject = `Thanks for contacting ${env2.SITE_NAME || "Dependable Painting"}`;
      const html = `<p>Hi ${lead.name || "there"},</p><p>We received your request about <strong>${lead.service || "painting"}</strong>. We'll call you shortly. Need immediate help? Call <strong>(251) 423-5855</strong>.</p><p>\u2014 ${env2.SITE_NAME || "Dependable Painting"}</p>`;
      await env2.LEAD_NOTIFY_QUEUE.send({ email: lead.email, name: lead.name, subject, html });
    }
  } catch (_) {
  }
}
__name(queueCustomerAutoReply, "queueCustomerAutoReply");
async function fanOutAnalytics(env2, lead) {
  try {
    if (env2.GA4_QUEUE) {
      await env2.GA4_QUEUE.send({ type: "lead_submit", page: lead.page, session: lead.session, city: lead.city, service: lead.service, source: lead.source });
    }
  } catch (_) {
  }
}
__name(fanOutAnalytics, "fanOutAnalytics");
async function handleContact(env2, request) {
  const body = await request.json().catch(() => null);
  if (!body) return j2({ error: "Invalid JSON" }, 400);
  const name = (body.name || "").trim().slice(0, 160);
  const email = (body.email || "").trim().slice(0, 200).toLowerCase();
  const { raw: phoneRaw, digits: phoneDigits } = normalizePhone(body.phone);
  const phone = phoneRaw.slice(0, 40);
  const service = (body.service || "").trim().slice(0, 160);
  const message = (body.message || body.description || "").trim().slice(0, 4e3);
  const page = (body.page || "/contact-form").slice(0, 300);
  const session = (body.session || "").slice(0, 120);
  const source = (body.source || body.utm_source || "web").slice(0, 120);
  if (!name || !service || !message || !phone && !email) {
    return j2({ error: "Missing required fields" }, 400);
  }
  const dup = await findDuplicate(env2, phoneDigits, email, service, message);
  const leadRecord = {
    name,
    email,
    phone,
    city: (body.city || "").slice(0, 160),
    zip: (body.zip || "").slice(0, 40),
    service,
    page,
    session,
    source,
    message,
    utm_source: body.utm_source || "",
    utm_medium: body.utm_medium || "",
    utm_campaign: body.utm_campaign || "",
    gclid: body.gclid || "",
    referrer: body.referrer || ""
  };
  let lead_id;
  if (!dup) {
    try {
      lead_id = await insertLead(env2, leadRecord);
      await insertEvent(env2, leadRecord);
    } catch (e) {
      return j2({ error: "database_error" }, 500);
    }
  }
  const risk = riskScore(message, body);
  request.signal.addEventListener("abort", () => {
  });
  await Promise.all([
    sendAdminEmail(env2, { ...leadRecord, lead_id }, risk),
    queueCustomerAutoReply(env2, leadRecord),
    fanOutAnalytics(env2, leadRecord)
  ]);
  return j2({ ok: true, lead_id, duplicate: dup, risk_score: risk.score, risk_reasons: risk.reasons });
}
__name(handleContact, "handleContact");

// src/index.ts
function json2(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers }
  });
}
__name(json2, "json");
async function parseJSON2(request) {
  try {
    return await request.json();
  } catch (_) {
    return null;
  }
}
__name(parseJSON2, "parseJSON");
async function handleForm(env2, request) {
  const body = await parseJSON2(request);
  if (!body) return json2({ error: "Invalid JSON" }, 400);
  const ts = (/* @__PURE__ */ new Date()).toISOString();
  const page = (body.page || "/").toString().slice(0, 300);
  const session = (body.session || "").toString().slice(0, 120);
  const service = (body.service || "").toString().slice(0, 120);
  const source = (body.source || "").toString().slice(0, 120);
  try {
    await env2.DB.prepare(
      `INSERT INTO lead_events (ts, day, hour, type, page, service, source, device, city, country, zip, area, session, scroll_pct, duration_ms, referrer, utm_source, utm_medium, utm_campaign, gclid)
       VALUES (?, date(?), strftime('%H', ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      ts,
      ts,
      ts,
      "form_submit",
      page,
      service,
      source,
      body.device || "",
      body.city || "",
      body.country || "",
      body.zip || "",
      body.area || "",
      session,
      Number.isFinite(Number(body.scroll_pct)) ? Number(body.scroll_pct) : 0,
      Number.isFinite(Number(body.duration_ms)) ? Number(body.duration_ms) : 0,
      body.referrer || "",
      body.utm_source || "",
      body.utm_medium || "",
      body.utm_campaign || "",
      body.gclid || ""
    ).run();
  } catch (e) {
    return json2({ error: "db error" }, 500);
  }
  return json2({ ok: true });
}
__name(handleForm, "handleForm");
async function handleCall(env2, request) {
  const body = await parseJSON2(request);
  if (!body) return json2({ error: "Invalid JSON" }, 400);
  const ts = (/* @__PURE__ */ new Date()).toISOString();
  try {
    await env2.DB.prepare(
      `INSERT INTO lead_events (ts, day, hour, type, page, service, source, device, city, country, zip, area, session, scroll_pct, duration_ms, referrer, utm_source, utm_medium, utm_campaign, gclid)
       VALUES (?, date(?), strftime('%H', ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      ts,
      ts,
      ts,
      "click_call",
      body.page || "",
      body.service || "",
      body.source || "",
      body.device || "",
      body.city || "",
      body.country || "",
      body.zip || "",
      body.area || "",
      body.session || "",
      Number.isFinite(Number(body.scroll_pct)) ? Number(body.scroll_pct) : 0,
      Number.isFinite(Number(body.duration_ms)) ? Number(body.duration_ms) : 0,
      body.referrer || "",
      body.utm_source || "",
      body.utm_medium || "",
      body.utm_campaign || "",
      body.gclid || ""
    ).run();
  } catch (e) {
    return json2({ error: "db error" }, 500);
  }
  return json2({ ok: true });
}
__name(handleCall, "handleCall");
async function handleStats(env2) {
  const thirty = new Date(Date.now() - 30 * 24 * 3600 * 1e3).toISOString();
  try {
    const events = await env2.DB.prepare(
      `SELECT type, COUNT(*) as cnt FROM lead_events WHERE ts >= ? GROUP BY type ORDER BY cnt DESC`
    ).bind(thirty).all();
    const leads = await env2.DB.prepare(
      `SELECT COUNT(*) as cnt FROM leads WHERE rowid IN (SELECT id FROM leads WHERE 1)`
    ).all();
    return json2({ ok: true, event_counts: events.results || [], total_leads: leads.results?.[0]?.cnt || 0 });
  } catch (e) {
    return json2({ error: "db error" }, 500);
  }
}
__name(handleStats, "handleStats");
async function handleChatHistory(env2, request) {
  const url = new URL(request.url);
  const session = url.searchParams.get("session") || "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 100);
  if (!session) return json2({ error: "session required" }, 400);
  try {
    const { results } = await env2.DB.prepare(
      `SELECT id, ts, question, answer, ai_provider, page FROM chat_log WHERE session = ? ORDER BY id DESC LIMIT ?`
    ).bind(session, limit).all();
    return json2({ ok: true, items: results });
  } catch (e) {
    return json2({ error: "db error" }, 500);
  }
}
__name(handleChatHistory, "handleChatHistory");
async function handleTrack(env2, request) {
  const body = await parseJSON2(request);
  if (!body) return json2({ error: "Invalid JSON" }, 400);
  const clientTs = typeof body.ts === "string" ? body.ts : null;
  const now = clientTs ? new Date(clientTs) : /* @__PURE__ */ new Date();
  const iso = now.toISOString();
  const day = iso.slice(0, 10);
  const hour = iso.slice(11, 13);
  const record = {
    type: (body.type || "event").toString().slice(0, 50),
    page: body.page || "",
    service: body.service || "",
    source: body.source || "",
    device: body.device || "",
    city: body.city || "",
    country: body.country || "",
    zip: body.zip || "",
    area: body.area || "",
    session: body.session || "",
    scroll_pct: Number.isFinite(Number(body.scroll_pct)) ? Number(body.scroll_pct) : 0,
    duration_ms: Number.isFinite(Number(body.duration_ms)) ? Number(body.duration_ms) : 0,
    referrer: body.referrer || "",
    utm_source: body.utm_source || "",
    utm_medium: body.utm_medium || "",
    utm_campaign: body.utm_campaign || "",
    gclid: body.gclid || ""
  };
  try {
    await env2.DB.prepare(
      `INSERT INTO lead_events (ts, day, hour, type, page, service, source, device, city, country, zip, area, session, scroll_pct, duration_ms, referrer, utm_source, utm_medium, utm_campaign, gclid)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      iso,
      day,
      hour,
      record.type,
      record.page,
      record.service,
      record.source,
      record.device,
      record.city,
      record.country,
      record.zip,
      record.area,
      record.session,
      record.scroll_pct,
      record.duration_ms,
      record.referrer,
      record.utm_source,
      record.utm_medium,
      record.utm_campaign,
      record.gclid
    ).run();
    if (env2.DB_2) {
      await env2.DB_2.prepare(
        `INSERT INTO lead_events (ts, day, hour, type, page, service, source, device, city, country, zip, area, session, scroll_pct, duration_ms, referrer, utm_source, utm_medium, utm_campaign, gclid)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(
        iso,
        day,
        hour,
        record.type,
        record.page,
        record.service,
        record.source,
        record.device,
        record.city,
        record.country,
        record.zip,
        record.area,
        record.session,
        record.scroll_pct,
        record.duration_ms,
        record.referrer,
        record.utm_source,
        record.utm_medium,
        record.utm_campaign,
        record.gclid
      ).run();
    }
  } catch (e) {
    console.error("D1 insert lead_events failed", e);
    return json2({ error: "Database operation failed." }, 500);
  }
  const measurement_id = "G-CLK9PTRD5N";
  const api_secret = env2.GA4_API_SECRET || "";
  const client_id = body.session || crypto.randomUUID();
  const ga4Params = {
    page_location: record.page || "https://dependablepainting.work",
    page_referrer: record.referrer || "",
    session_id: record.session || "",
    engagement_time_msec: record.duration_ms ? String(record.duration_ms) : void 0,
    scroll_pct: record.scroll_pct,
    city: record.city,
    zip: record.zip,
    area: record.area
  };
  Object.keys(ga4Params).forEach((k) => ga4Params[k] === void 0 && delete ga4Params[k]);
  const ga4Payload = { client_id, events: [{ name: body.type || "event", params: ga4Params }] };
  try {
    if (api_secret) {
      const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurement_id}&api_secret=${api_secret}`;
      const resp = await fetch(url, { method: "POST", body: JSON.stringify(ga4Payload), headers: { "Content-Type": "application/json" } });
      if (!resp.ok) {
        const tx = await resp.text().catch(() => "");
        return json2({ error: `GA4 error: ${resp.status} ${tx.slice(0, 300)}` }, 502);
      }
    }
  } catch (e) {
  }
  return json2({ ok: true });
}
__name(handleTrack, "handleTrack");
function notImpl() {
  return json2({ success: false, message: "Not implemented yet" }, 501);
}
__name(notImpl, "notImpl");
async function serveStaticAsset(env2, request) {
  try {
    if (env2.ASSETS && typeof env2.ASSETS.fetch === "function") {
      const assetResp = await env2.ASSETS.fetch(request);
      if (assetResp.status !== 404) {
        const url = new URL(request.url);
        const path = url.pathname.toLowerCase();
        const headers = new Headers(assetResp.headers);
        if (!headers.has("content-type")) {
          if (path.endsWith(".css")) headers.set("content-type", "text/css; charset=utf-8");
          else if (path.endsWith(".js")) headers.set("content-type", "application/javascript; charset=utf-8");
          else if (path.endsWith(".json")) headers.set("content-type", "application/json; charset=utf-8");
          else if (path.endsWith(".svg")) headers.set("content-type", "image/svg+xml");
          else if (path.endsWith(".ico")) headers.set("content-type", "image/x-icon");
          else if (path.endsWith(".png")) headers.set("content-type", "image/png");
          else if (path.endsWith(".jpg") || path.endsWith(".jpeg")) headers.set("content-type", "image/jpeg");
          else if (path.endsWith(".webp")) headers.set("content-type", "image/webp");
          else if (path.endsWith(".html") || path.endsWith(".htm")) headers.set("content-type", "text/html; charset=utf-8");
        }
        if (!headers.has("cache-control")) {
          if (/\.(?:css|js|png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(path)) {
            headers.set("cache-control", "public, max-age=31536000, immutable");
          } else {
            headers.set("cache-control", "public, max-age=0, must-revalidate");
          }
        }
        return new Response(assetResp.body, { status: assetResp.status, headers });
      }
    }
  } catch (e) {
    console.warn("Asset fetch error", e);
  }
  return new Response("Not Found", { status: 404, headers: { "Cache-Control": "no-store" } });
}
__name(serveStaticAsset, "serveStaticAsset");
var src_default = {
  async fetch(request, env2, ctx) {
    const { pathname } = new URL(request.url);
    const method = request.method.toUpperCase();
    if (pathname === "/api/estimate" && method === "POST") return handleContact(env2, request);
    if (pathname === "/api/contact" && method === "POST") return handleContact(env2, request);
    if (pathname === "/api/form" && method === "POST") return handleForm(env2, request);
    if (pathname === "/api/call" && method === "POST") return handleCall(env2, request);
    if (pathname === "/api/stats" && method === "GET") return handleStats(env2);
    if (pathname === "/api/chat/history" && method === "GET") return handleChatHistory(env2, request);
    if (pathname === "/api/event" && method === "POST") return handleTrack(env2, request);
    if (pathname.startsWith("/api/lead/") && method === "GET") {
      const id = pathname.split("/").pop();
      if (!id) return json2({ error: "id required" }, 400);
      try {
        const row = await env2.DB.prepare(
          `SELECT id, name, email, phone, city, zip, service, page, source, session, message FROM leads WHERE id = ?`
        ).bind(id).first();
        if (!row) return json2({ ok: false, error: "not found" }, 404);
        return json2({ ok: true, lead: row });
      } catch (e) {
        return json2({ error: "db error" }, 500);
      }
    }
    if (pathname === "/api/leads" && method === "GET") {
      const url = new URL(request.url);
      const q = url.searchParams.get("q");
      const source = url.searchParams.get("source");
      const city = url.searchParams.get("city");
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 200);
      const offset = parseInt(url.searchParams.get("offset") || "0", 10) || 0;
      const filters = [];
      const args = [];
      if (source) {
        filters.push("source = ?");
        args.push(source);
      }
      if (city) {
        filters.push("city = ?");
        args.push(city);
      }
      if (q) {
        filters.push("(name LIKE ? OR email LIKE ? OR phone LIKE ?)");
        args.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }
      const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
      try {
        const { results } = await env2.DB.prepare(
          `SELECT id, name, email, phone, city, zip, service, page, source, session, message
           FROM leads ${where} ORDER BY id DESC LIMIT ? OFFSET ?`
        ).bind(...args, limit, offset).all();
        return json2({ ok: true, items: results });
      } catch (e) {
        return json2({ error: "db error" }, 500);
      }
    }
    if (pathname === "/api/chat" && method === "POST") return handleChat(env2, request);
    if (pathname === "/api/charge" && method === "POST") return notImpl();
    if (pathname === "/api/track" && method === "POST") return handleTrack(env2, request);
    if (pathname === "/api/track/advanced" && method === "POST") return handleAdvancedTrack(env2, request);
    if (pathname === "/api/lead-status" && method === "POST") return notImpl();
    if (pathname === "/api/job" && method === "POST") return notImpl();
    if (pathname === "/api/geo/classify" && method === "GET") return notImpl();
    if (pathname === "/api/health" && method === "GET") return json2({ ok: true, ts: Date.now() });
    return serveStaticAsset(env2, request);
  },
  async queue(batch, env2, ctx) {
    const qName = batch.queue;
    for (const msg of batch.messages) {
      try {
        const data = msg.body;
        switch (qName) {
          case "painter-chat-log-interaction": {
            if (data && data.session && data.question && data.answer) {
              try {
                await env2.DB.prepare(
                  "INSERT INTO chat_log (ts, session, question, answer, ai_provider, user_agent, page) VALUES (datetime('now'),?,?,?,?,?,?)"
                ).bind(
                  data.session,
                  data.question,
                  data.answer,
                  data.provider || "",
                  data.ua || "",
                  data.page || ""
                ).run();
              } catch (_) {
              }
            }
            break;
          }
          case "painter-lead": {
            if (data && data.name && (data.phone || data.email) && data.service) {
              try {
                await env2.DB.prepare(
                  `INSERT INTO leads (name, email, phone, city, zip, service, page, session, source, message)
                   VALUES (?,?,?,?,?,?,?,?,?,?)`
                ).bind(
                  data.name,
                  data.email || "",
                  data.phone || "",
                  data.city || "",
                  data.zip || "",
                  data.service || "",
                  data.page || "",
                  data.session || "",
                  data.source || "queue",
                  data.message || ""
                ).run();
              } catch (e) {
                msg.retry();
              }
            }
            break;
          }
          case "painter-analytics-forward-ga4": {
            try {
              const measurement_id = "G-CLK9PTRD5N";
              const api_secret = env2.GA4_API_SECRET || "";
              if (api_secret) {
                const client_id = data?.session || data?.client_id || crypto.randomUUID();
                const ga4Payload = {
                  client_id,
                  events: [
                    { name: (data?.type || "event").toString().slice(0, 40), params: {
                      page_location: data?.page || "https://dependablepainting.work",
                      session_id: data?.session || "",
                      city: data?.city || "",
                      source: data?.source || "",
                      service: data?.service || ""
                    } }
                  ]
                };
                const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurement_id}&api_secret=${api_secret}`;
                const resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ga4Payload) });
                if (!resp.ok) {
                  if (resp.status >= 500) msg.retry();
                }
              }
            } catch (_) {
              msg.retry();
            }
            break;
          }
          case "painter-lead-notify-customer": {
            try {
              if (env2.SEB && env2.SEB.send && data?.email) {
                const fromAddr = env2.FROM_ADDR || "no-reply@dependablepainting.work";
                const subject = data.subject || `Thanks for contacting ${env2.SITE_NAME || "Dependable Painting"}`;
                const html = data.html || `<p>Hi ${data.name || "there"},</p><p>We received your request and will be in touch shortly. Need us now? Call <strong>(251) 423-5855</strong>.</p>`;
                try {
                  if (typeof EmailMessage !== "undefined") {
                    const msgObj = new EmailMessage(fromAddr, data.email, subject);
                    msgObj.setBody("text/html", html);
                    await env2.SEB.send(msgObj);
                  } else {
                    await env2.SEB.send({ from: fromAddr, to: data.email, subject, html });
                  }
                } catch (inner) {
                  msg.retry();
                }
              }
            } catch (_) {
            }
            break;
          }
          default:
            break;
        }
      } catch (err) {
        try {
          msg.retry();
        } catch (_) {
        }
      }
    }
  }
};

// ../../Library/pnpm/global/5/.pnpm/wrangler@4.40.1/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../Library/pnpm/global/5/.pnpm/wrangler@4.40.1/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } catch (e) {
    const error3 = reduceError(e);
    return Response.json(error3, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-9y7NPi/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../Library/pnpm/global/5/.pnpm/wrangler@4.40.1/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env2, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env2, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env2, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env2, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-9y7NPi/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env2, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env2, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env2, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env2, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env2, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env2, ctx) => {
      this.env = env2;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
