// BRIDGE-STUB-BB — a FAKE stand-in for the blackboard-ultra skill's bb.js, for the dry runs of
// recipes/blackboard/boot-bb.ts and export-grades.ts on the localhost fixture page (Step 8 S6).
// Written 2026-10-23. Every value below is invented test data: no real course, column, user or grade.
// It fetches nothing and talks to no server. Its write functions throw, so a dry run that reached one
// would fail loudly (the recipes never call them: recipes/blackboard/readonly.ts).
//
// Same load shape as bb.js: an expression that defines window.bb once and returns a string; the course
// comes from window.BB_COURSE (the recipe sets it), as bb.js allows.
(() => {
  const w = typeof window !== 'undefined' ? window : globalThis;
  if (w.bb) return 'bb already loaded (' + w.bb.VERSION + ')';
  const VERSION = 'stub-2026-10-23';
  const C = w.BB_COURSE;
  if (!C) throw new Error('bb: not on a course page and window.BB_COURSE not set');
  const P = '/learn/api/public/v1/courses/' + C;
  const P2 = '/learn/api/public/v2/courses/' + C;
  const I = '/learn/api/v1/courses/' + C;
  // Invented gradebook: three columns (one with a malformed id, which the export must skip and count)
  // and invented users "_9001_1" …; scores are arbitrary numbers.
  const columns = [
    { id: '_302_1', name: 'Stub Quiz B', score: { possible: 10 } },
    { id: '_301_1', name: 'Stub Quiz A', score: { possible: 5 } },
    { id: 'not-an-id', name: 'Stub malformed column', score: { possible: 1 } },
  ];
  const grades = {
    _301_1: [
      { userId: '_9002_1', columnId: '_301_1', status: 'Graded', score: 4, text: '4.00' },
      { userId: '_9001_1', columnId: '_301_1', status: 'Graded', score: 5, text: '5.00' },
    ],
    _302_1: [
      { userId: '_9001_1', columnId: '_302_1', status: 'NeedsGrading' },
      { userId: '_9003_1', columnId: '_302_1', status: 'Graded', score: 7.5, text: '7.50', feedback: 'Stub feedback "quoted" é' },
    ],
  };
  let writes = 0;
  const refuse = (name) => () => {
    writes++;
    throw new Error('stub: write refused (' + name + ')');
  };
  const read = (path) => {
    if (path === P2 + '/gradebook/columns') return columns.map((c) => JSON.parse(JSON.stringify(c)));
    const m = /^\/learn\/api\/public\/v2\/courses\/[^/]+\/gradebook\/columns\/([^/]+)\/users$/.exec(path);
    if (m && path.startsWith(P2 + '/') && grades[m[1]]) return JSON.parse(JSON.stringify(grades[m[1]]));
    if (m && path.startsWith(P2 + '/')) return [];
    return null;
  };
  w.bb = {
    VERSION, C, P, P2, I,
    B: 'http://stub.invalid', L: 'http://stub.invalid',
    get writes() { return writes; },
    get: async (p) => {
      const r = read(p);
      return r === null ? { status: 404, ok: false, json: null } : { status: 200, ok: true, json: { results: r } };
    },
    all: async (p) => {
      const r = read(p);
      if (r === null) throw new Error('404 stub: no such list');
      return r;
    },
    post: refuse('post'), patch: refuse('patch'), put: refuse('put'), del: refuse('del'),
    grade: refuse('grade'), clearGrade: refuse('clearGrade'), column: refuse('column'),
    deleteColumn: refuse('deleteColumn'), gradeFeedback: refuse('gradeFeedback'), announce: refuse('announce'),
  };
  return 'bb loaded';
})();
