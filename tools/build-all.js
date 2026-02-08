const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const isWin = process.platform === 'win32';

const args = new Set(process.argv.slice(2));
const wantAll = args.size === 0 || args.has('--all');
const wantWeb = wantAll || args.has('--web');
const wantDeploy = wantAll || args.has('--deploy');
const wantAndroid = wantAll || args.has('--android');
const wantElectron = wantAll || args.has('--electron');

function run(cmd, cmdArgs, opts = {}) {
  const printable = isWin ? `${cmd} ${cmdArgs.join(' ')}` : `${cmd} ${cmdArgs.join(' ')}`;
  console.log(`\n> ${printable}`);

  // ВАЖНО: на Windows для .cmd/.bat нужен shell:true, иначе бывает странное поведение
  const r = spawnSync(cmd, cmdArgs, {
    stdio: 'inherit',
    shell: isWin,          // <- фикс
    ...opts,
  });

  if (r.status !== 0) process.exit(r.status || 1);
}

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function ensureJavaEnv(env) {
  if (env.JAVA_HOME && exists(path.join(env.JAVA_HOME, 'bin', isWin ? 'java.exe' : 'java'))) return env;

  const candidates = [
    process.env.JAVA_HOME,
    'C:\\Program Files\\Android\\Android Studio\\jbr',
    'C:\\Program Files\\Android\\Android Studio\\jre',
  ].filter(Boolean);

  for (const c of candidates) {
    if (exists(path.join(c, 'bin', 'java.exe'))) {
      env.JAVA_HOME = c;
      return env;
    }
  }
  console.warn('\n[WARN] JAVA_HOME не найден. Для Android нужен JDK 17 (лучше Android Studio\\jbr).');
  return env;
}

(async () => {
  console.log('\nOrionGram build-all\n');

  const env = ensureJavaEnv({ ...process.env });

  // 0) deps
  if (!exists(path.join(root, 'node_modules'))) {
    run('npm', ['install'], { env });
  }

  // 1) web build (общий)
  if (wantWeb || wantAndroid || wantElectron || wantDeploy) {
    run('npm', ['run', 'build'], { env });
    if (!exists(path.join(root, 'dist', 'index.html'))) {
      console.error('\n[ERROR] dist/index.html не найден — build не собрался.');
      process.exit(1);
    }
  }

  // 2) android
  if (wantAndroid) {
    run('npx', ['cap', 'sync', 'android'], { env });

    const androidDir = path.join(root, 'android');
    const gradlew = path.join(androidDir, isWin ? 'gradlew.bat' : 'gradlew');
    if (!exists(gradlew)) {
      console.error('\n[ERROR] android/gradlew не найден. Запусти один раз: npx cap add android');
      process.exit(1);
    }

    run(gradlew, ['assembleDebug'], { cwd: androidDir, env });

    const apk = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
    console.log('\nAndroid APK:');
    console.log(exists(apk) ? '  ' + apk : '  (не найден, проверь вывод gradle)');
  }

  // 3) desktop
  if (wantElectron) {
    if (isWin) run('npm', ['run', 'electron:build:win'], { env });
    else if (process.platform === 'darwin') run('npm', ['run', 'electron:build:mac'], { env });
    else run('npm', ['run', 'electron:build:linux'], { env });

    console.log('\nDesktop output:');
    console.log('  ' + path.join(root, 'release'));
  }

  // 4) deploy
  if (wantDeploy) {
    run('npx', ['firebase', 'deploy', '--only', 'hosting'], { env });
  }

  console.log('\nDone.');
})();