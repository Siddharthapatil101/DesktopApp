console.log('Testing MDM Security Desktop App...');
function testMainElements() {
    const tests = [
        { name: 'Loading Screen', selector: '#loadingScreen' },
        { name: 'Header', selector: '.header' },
        { name: 'Sidebar', selector: '.sidebar' },
        { name: 'Main Content', selector: '.main-content' },
        { name: 'Dashboard', selector: '#dashboard' },
        { name: 'Check In Button', selector: '#checkInBtn' },
        { name: 'Check Out Button', selector: '#checkOutBtn' }
    ];
    console.log('\n=== Element Tests ===');
    tests.forEach(test => {
        const element = document.querySelector(test.selector);
        console.log(`${test.name}: ${element ? '✅ Found' : '❌ Missing'}`);
    });
}
function testFunctions() {
    const functions = [
        'showLoadingScreen',
        'hideLoadingScreen',
        'initializeApp',
        'setupEventListeners',
        'setupWindowControls',
        'updateButtonStates',
        'updateStatistics'
    ];
    console.log('\n=== Function Tests ===');
    functions.forEach(funcName => {
        const func = window[funcName];
        console.log(`${funcName}: ${typeof func === 'function' ? '✅ Available' : '❌ Missing'}`);
    });
}
function testElectronAPI() {
    console.log('\n=== Electron API Tests ===');
    if (window.electronAPI) {
        console.log('✅ electronAPI available');
        const methods = ['saveState', 'getSavedState', 'minimizeWindow', 'maximizeWindow', 'closeWindow'];
        methods.forEach(method => {
            console.log(`${method}: ${typeof window.electronAPI[method] === 'function' ? '✅ Available' : '❌ Missing'}`);
        });
    } else {
        console.log('❌ electronAPI not available');
    }
}
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        testMainElements();
        testFunctions();
        testElectronAPI();
        console.log('\n=== Test Complete ===');
    }, 3000);
});
