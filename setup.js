/* PATCH_GOOGLE_LOGIN.js
   Run: node PATCH_GOOGLE_LOGIN.js
*/
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function backup(rel) {
  const full = path.join(ROOT, rel);
  if (!exists(full)) return;
  const bak = full + '.bak';
  if (!exists(bak)) fs.copyFileSync(full, bak);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function write(rel, content) {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  backup(rel);
  fs.writeFileSync(full, content, 'utf8');
  console.log('patched:', rel);
}

function patchFirebaseAuthImport(authTs) {
  // Находим: import { ... } from 'firebase/auth';
  const re = /import\s*\{\s*([\s\S]*?)\s*\}\s*from\s*['"]firebase\/auth['"];\s*/m;
  const m = authTs.match(re);
  if (!m) return authTs;

  const inside = m[1]
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);

  const need = ['GoogleAuthProvider', 'signInWithPopup'];
  const set = new Set(inside);

  let changed = false;
  for (const n of need) {
    if (!set.has(n)) {
      inside.push(n);
      changed = true;
    }
  }

  if (!changed) return authTs;

  const rebuilt =
    "import {\n  " +
    inside.join(',\n  ') +
    ",\n} from 'firebase/auth';\n";

  return authTs.replace(re, rebuilt);
}

function ensureStartGoogleSignIn() {
  const rel = 'src/api/auth.ts';
  if (!exists(path.join(ROOT, rel))) {
    console.warn('skip: src/api/auth.ts not found');
    return;
  }

  let s = read(rel);
  if (s.includes('export async function startGoogleSignIn')) {
    console.log('ok: startGoogleSignIn already exists');
    return;
  }

  // 1) ensure imports
  s = patchFirebaseAuthImport(s);

  // 2) append function at end
  const block = `

/** Minimal Google sign-in (Popup). Works on Web + Electron.
 *  For Android WebView you will need redirect/native plugin later.
 */
const __ogGoogleProvider = new GoogleAuthProvider();
__ogGoogleProvider.setCustomParameters({ prompt: 'select_account' });

export async function startGoogleSignIn(): Promise<void> {
  await signInWithPopup(auth, __ogGoogleProvider);
}
`;
  s += block;
  write(rel, s);
}

function patchAuthScreen() {
  const rel = 'src/components/Auth/AuthScreen.tsx';
  if (!exists(path.join(ROOT, rel))) {
    console.warn('skip: AuthScreen.tsx not found');
    return;
  }

  let s = read(rel);

  // Если кнопка уже есть — выходим
  if (s.includes('Войти через Google') || s.includes('handleGoogle')) {
    console.log('ok: AuthScreen already has Google button/handler');
    return;
  }

  // 1) добавить импорт startGoogleSignIn
  if (!s.includes("startGoogleSignIn")) {
    // если есть импорт из ../../api/auth
    const reAuthImport = /import\s*\{\s*([\s\S]*?)\s*\}\s*from\s*['"]\.\.\/\.\.\/api\/auth['"];\s*/m;
    const m = s.match(reAuthImport);

    if (m) {
      const inside = m[1].split(',').map(x => x.trim()).filter(Boolean);
      if (!inside.includes('startGoogleSignIn')) inside.push('startGoogleSignIn');
      const rebuilt =
        "import {\n  " +
        inside.join(',\n  ') +
        ",\n} from '../../api/auth';\n";
      s = s.replace(reAuthImport, rebuilt);
    } else {
      // иначе добавим отдельный импорт после остальных
      s = s.replace(/import\s+[^;]+;\s*\n/gm, (all) => all) + `\nimport { startGoogleSignIn } from '../../api/auth';\n`;
    }
  }

  // 2) вставить handleGoogle перед return
  const idxReturn = s.indexOf('return (');
  if (idxReturn === -1) {
    console.warn('skip: cannot find return ( in AuthScreen');
    return;
  }

  const hasSetError = s.includes('setError(');

  const handleGoogleFn = `
  const handleGoogle = async () => {
    try {
      await startGoogleSignIn();
    } catch (e: any) {
      console.error(e);
      ${hasSetError ? "setError(e?.message || 'Ошибка Google входа');" : "alert(e?.message || 'Ошибка Google входа');"}
    }
  };

`;

  s = s.slice(0, idxReturn) + handleGoogleFn + s.slice(idxReturn);

  // 3) вставить кнопку после первой "contained" кнопки (обычно Войти/Создать аккаунт)
  const firstContained = s.indexOf('variant="contained"');
  if (firstContained !== -1) {
    const closeBtn = s.indexOf('</Button>', firstContained);
    if (closeBtn !== -1) {
      const insertPos = closeBtn + '</Button>'.length;
      const btn = `
              <Button
                fullWidth
                variant="outlined"
                onClick={handleGoogle}
                sx={{ borderRadius: '20px', py: 1.2, mt: 1 }}
              >
                Войти через Google
              </Button>
`;
      s = s.slice(0, insertPos) + btn + s.slice(insertPos);
    }
  }

  write(rel, s);
}

function patchElectronMainAllowPopup() {
  const rel = 'electron/main.js';
  if (!exists(path.join(ROOT, rel))) {
    console.warn('skip: electron/main.js not found');
    return;
  }

  let s = read(rel);

  // 1) ensure shell in destructuring require('electron')
  s = s.replace(
    /const\s*\{\s*([^}]+)\s*\}\s*=\s*require\(['"]electron['"]\);\s*/m,
    (m, inside) => {
      const parts = inside.split(',').map(x => x.trim()).filter(Boolean);
      const set = new Set(parts);
      const need = ['shell'];
      for (const n of need) if (!set.has(n)) parts.push(n);
      return `const { ${parts.join(', ')} } = require('electron');\n`;
    }
  );

  // 2) replace setWindowOpenHandler block to allow Google/Firebase auth popups
  const handlerRe = /mainWindow\.webContents\.setWindowOpenHandler\(\s*\(\s*\{\s*[^}]*\}\s*\)\s*=>\s*\{[\s\S]*?\}\s*\)\s*;?/m;
  const newHandler = `
  // Allow Google/Firebase auth popups inside Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const allowAuth =
      url.startsWith('https://accounts.google.com/') ||
      url.includes('/__/auth/') ||
      url.includes('firebaseapp.com') ||
      url.includes('googleusercontent.com') ||
      url.includes('apis.google.com');

    if (allowAuth) return { action: 'allow' };

    shell.openExternal(url);
    return { action: 'deny' };
  });
`;

  if (s.match(handlerRe)) {
    s = s.replace(handlerRe, newHandler.trim());
  } else {
    // если handler вообще не найден — вставим после loadFile
    const loadIdx = s.indexOf('mainWindow.loadFile');
    if (loadIdx !== -1) {
      const afterLine = s.indexOf('\n', loadIdx);
      s = s.slice(0, afterLine + 1) + newHandler + s.slice(afterLine + 1);
    }
  }

  write(rel, s);
}

try {
  console.log('\n[PATCH] Google login + Electron popup allowlist\n');

  ensureStartGoogleSignIn();
  patchAuthScreen();
  patchElectronMainAllowPopup();

  console.log('\n✅ Done.');
  console.log('\nNext run:');
  console.log('  npm run build');
  console.log('  npm run electron:dev');
  console.log('\n(Для Web просто: npm run dev)');
} catch (e) {
  console.error('\n❌ Patch failed:', e?.message || e);
  process.exit(1);
}