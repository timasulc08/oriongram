const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

console.log('>>> ФИКС БИЛДА И СБОРКА <<<');

// 1. Исправляем package.json (отключаем установщик, делаем просто папку с EXE)
const pkgPath = path.join(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

pkg.build.win = {
  // "dir" = просто распакованная папка. Это обходит ошибку 7zip.
  "target": "dir", 
  "icon": "build/icon.ico",
  "verifyUpdateCodeSignature": false
};

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log('1. package.json исправлен (режим dir)');

// 2. Очищаем кэш electron-builder (удаляем битый архив)
const cachePath = path.join(process.env.LOCALAPPDATA, 'electron-builder', 'Cache');
if (fs.existsSync(cachePath)) {
  try {
    fs.rmSync(cachePath, { recursive: true, force: true });
    console.log('2. Кэш electron-builder очищен');
  } catch (e) {
    console.log('2. Не удалось очистить кэш (не страшно):', e.message);
  }
}

// 3. Собираем
console.log('3. Запуск сборки...');
const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';

const build = spawnSync(npm, ['run', 'electron:build:win'], { 
  stdio: 'inherit', 
  shell: true 
});

if (build.status === 0) {
  console.log('\n✅ ГОТОВО!');
  console.log('Твой EXE файл находится здесь:');
  console.log(path.join(process.cwd(), 'release', 'win-unpacked', 'OrionGram.exe'));
  console.log('\n(Запускай этот файл, это готовое приложение)');
} else {
  console.log('\n❌ Ошибка сборки.');
}