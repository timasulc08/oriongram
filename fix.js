const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true, ...opts });
  if (r.status !== 0) {
    console.error(`❌ Ошибка выполнения команды: ${cmd}`);
    process.exit(1);
  }
}

async function build() {
  const jbrPath = "C:\\Program Files\\Android\\Android Studio\\jbr";
  if (fs.existsSync(jbrPath)) process.env.JAVA_HOME = jbrPath;

  console.log('📦 1. Собираем веб-версию...');
  run('npm', ['run', 'build']);

  console.log('🔄 2. Синхронизируем Capacitor...');
  run('npx', ['cap', 'sync', 'android']);

  console.log('🏗 3. Собираем APK через Gradle...');
  const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  run(gradlew, ['assembleDebug'], { cwd: path.join(ROOT, 'android') });

  const apkPath = path.join(ROOT, 'android/app/build/outputs/apk/debug/app-debug.apk');
  if (fs.existsSync(apkPath)) {
    console.log('\n=========================================');
    console.log('🎉 УСПЕХ! Приложение собрано.');
    console.log('📂 APK файл тут: ' + apkPath);
    console.log('=========================================');
  }
}

build();