// Simple test utility to validate parent tracker functionality
// This can be run in the browser console to test the parent-child relationship

async function testParentTrackerFunctionality() {
  console.log('🧪 Testing Parent Tracker Functionality...');

  try {
    // Import the necessary functions
    const { saveTracker, saveEntry, getEntry, addToEntry, clearAllData, initDB } = window;

    if (!saveTracker) {
      console.error('❌ Database functions not available. Make sure the app is loaded.');
      return;
    }

    // Initialize database
    await initDB();

    // Clear existing data for clean test
    await clearAllData();
    console.log('✅ Database cleared');

    // Create parent tracker
    const parentTracker = await saveTracker({
      title: 'Test Alcohol',
      type: 'liters',
      isNumber: true
    });
    console.log('✅ Created parent tracker:', parentTracker.title);

    // Create child tracker
    const childTracker = await saveTracker({
      title: 'Test Beer',
      type: 'liters',
      isNumber: true,
      parentId: parentTracker.id
    });
    console.log('✅ Created child tracker:', childTracker.title);

    const testDate = '2024-01-01';

    // Test 1: Add entry to child tracker
    console.log('\n📝 Test 1: Adding 0.5L to child tracker...');
    await addToEntry(childTracker.id, testDate, 0.5);

    const childValue = await getEntry(childTracker.id, testDate);
    const parentValue = await getEntry(parentTracker.id, testDate);

    console.log(`Child tracker value: ${childValue}L`);
    console.log(`Parent tracker value: ${parentValue}L`);

    if (childValue === 0.5 && parentValue === 0.5) {
      console.log('✅ Test 1 PASSED: Parent tracker automatically updated');
    } else {
      console.log('❌ Test 1 FAILED: Parent tracker not updated correctly');
    }

    // Test 2: Add more to child tracker
    console.log('\n📝 Test 2: Adding another 0.3L to child tracker...');
    await addToEntry(childTracker.id, testDate, 0.3);

    const childValue2 = await getEntry(childTracker.id, testDate);
    const parentValue2 = await getEntry(parentTracker.id, testDate);

    console.log(`Child tracker value: ${childValue2}L`);
    console.log(`Parent tracker value: ${parentValue2}L`);

    if (childValue2 === 0.8 && parentValue2 === 0.8) {
      console.log('✅ Test 2 PASSED: Parent tracker updated correctly with additional value');
    } else {
      console.log('❌ Test 2 FAILED: Parent tracker not updated correctly');
    }

    // Test 3: Direct entry to parent tracker
    console.log('\n📝 Test 3: Adding 0.2L directly to parent tracker...');
    await addToEntry(parentTracker.id, testDate, 0.2);

    const childValue3 = await getEntry(childTracker.id, testDate);
    const parentValue3 = await getEntry(parentTracker.id, testDate);

    console.log(`Child tracker value: ${childValue3}L`);
    console.log(`Parent tracker value: ${parentValue3}L`);

    if (childValue3 === 0.8 && parentValue3 === 1.0) {
      console.log('✅ Test 3 PASSED: Parent tracker can be updated independently');
    } else {
      console.log('❌ Test 3 FAILED: Parent tracker direct update failed');
    }

    // Test 4: Create second child tracker
    console.log('\n📝 Test 4: Creating second child tracker and testing multiple children...');
    const childTracker2 = await saveTracker({
      title: 'Test Wine',
      type: 'liters',
      isNumber: true,
      parentId: parentTracker.id
    });

    await addToEntry(childTracker2.id, testDate, 0.15);

    const child1Value = await getEntry(childTracker.id, testDate);
    const child2Value = await getEntry(childTracker2.id, testDate);
    const parentValueFinal = await getEntry(parentTracker.id, testDate);

    console.log(`Child 1 (Beer) value: ${child1Value}L`);
    console.log(`Child 2 (Wine) value: ${child2Value}L`);
    console.log(`Parent (Alcohol) value: ${parentValueFinal}L`);

    if (child1Value === 0.8 && child2Value === 0.15 && parentValueFinal === 1.15) {
      console.log('✅ Test 4 PASSED: Multiple child trackers update parent correctly');
    } else {
      console.log('❌ Test 4 FAILED: Multiple child tracker updates failed');
    }

    console.log('\n🎉 Parent tracker functionality tests completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Instructions for running the test
console.log(`
🧪 Parent Tracker Test Utility Loaded!

To run the test, execute in the browser console:
testParentTrackerFunctionality()

This will test:
1. Child tracker updates automatically update parent
2. Multiple additions to child tracker accumulate in parent
3. Parent tracker can be updated independently
4. Multiple child trackers can update same parent

Make sure the app is loaded and database functions are available.
`);

// Make the test function globally available
if (typeof window !== 'undefined') {
  window.testParentTrackerFunctionality = testParentTrackerFunctionality;
}
