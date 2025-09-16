import { HotModuleReplacer } from './src/hmr';
import { resolve } from 'path';

async function testHMR() {
  console.log('🔥 Testing Better-MDX Hot Module Replacement');
  console.log('='.repeat(60));

  const hmr = new HotModuleReplacer({
    rootDir: resolve('./mdx'),
    port: 3001,
    debounceMs: 100,
    enableSSE: true,
    verbose: true
  });

  // Set up event listeners
  hmr.on('hmr:started', ({ fileCount }) => {
    console.log(`✅ HMR started watching ${fileCount} files`);
  });

  hmr.on('hmr:update', (update) => {
    console.log(`🔄 HMR Update: ${update.type} - ${update.file}`);
    if (update.compiled) {
      console.log(`   📄 Compiled successfully`);
    }
  });

  hmr.on('hmr:error', (update) => {
    console.log(`❌ HMR Error: ${update.file}`);
    console.log(`   Error: ${update.error}`);
  });

  // Start watching
  hmr.startWatching();

  console.log('\n📊 Current compilation status:');
  const status = hmr.getCompilationStatus();
  for (const [file, info] of Object.entries(status)) {
    console.log(`   ${file}: ${info.compiled ? '✅ compiled' : '❌ not compiled'}`);
  }

  console.log('\n🌐 HMR Client Script (first 200 chars):');
  const clientScript = hmr.getClientScript();
  console.log(clientScript.substring(0, 200) + '...');

  console.log('\n🎯 HMR system is ready!');
  console.log('   • Watching MDX files for changes');
  console.log('   • Server-Sent Events enabled');
  console.log('   • React integration available');

  console.log('\n⚡ To test HMR:');
  console.log('   1. Modify a file in ./mdx/ directory');
  console.log('   2. Watch the console for update events');
  console.log('   3. Use the client script in your HTML page');

  // Clean shutdown after 5 seconds
  setTimeout(() => {
    console.log('\n🛑 Stopping HMR for test...');
    hmr.stopWatching();
    console.log('✅ HMR test completed!');
  }, 5000);
}

// Run the test
testHMR().catch(console.error);