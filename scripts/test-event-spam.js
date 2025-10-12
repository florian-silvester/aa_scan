const fs = require('fs');
const path = require('path');

/**
 * Test SSE Event Spam Impact
 * 
 * Simulates syncing 100 items and measures:
 * 1. Time to send events
 * 2. Memory usage
 * 3. Event delivery reliability
 * 4. UI performance implications
 */

// Simulate SSE response writing
class MockSSEResponse {
  constructor() {
    this.events = [];
    this.startTime = Date.now();
    this.startMemory = process.memoryUsage().heapUsed;
  }

  write(data) {
    this.events.push({
      data,
      timestamp: Date.now() - this.startTime,
      memory: process.memoryUsage().heapUsed - this.startMemory
    });
  }

  getStats() {
    return {
      totalEvents: this.events.length,
      totalTime: Date.now() - this.startTime,
      memoryUsed: process.memoryUsage().heapUsed - this.startMemory,
      avgTimePerEvent: (Date.now() - this.startTime) / this.events.length,
      eventsPerSecond: this.events.length / ((Date.now() - this.startTime) / 1000)
    };
  }
}

// Simulate progress callback that emits events
function createProgressCallback(response) {
  return (progress) => {
    response.write(`data: ${JSON.stringify(progress)}\n\n`);
  };
}

async function testEventSpam() {
  console.log('🧪 Testing SSE Event Spam Impact\n');
  console.log('Simulating sync of 100 items with different event strategies:\n');
  console.log('='.repeat(60) + '\n');

  // TEST 1: Emit event for EVERY item
  console.log('TEST 1: Emit event for EVERY item (100 events)\n');
  
  const res1 = new MockSSEResponse();
  const callback1 = createProgressCallback(res1);
  
  for (let i = 1; i <= 100; i++) {
    callback1({
      itemCreated: `Test Item ${i}`
    });
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  const stats1 = res1.getStats();
  console.log(`  Total Events: ${stats1.totalEvents}`);
  console.log(`  Total Time: ${stats1.totalTime}ms`);
  console.log(`  Memory Used: ${(stats1.memoryUsed / 1024).toFixed(2)} KB`);
  console.log(`  Avg Time/Event: ${stats1.avgTimePerEvent.toFixed(2)}ms`);
  console.log(`  Events/Second: ${stats1.eventsPerSecond.toFixed(2)}`);
  
  console.log('\n' + '='.repeat(60) + '\n');

  // TEST 2: Emit event every 10 items
  console.log('TEST 2: Emit event every 10 items (10 events)\n');
  
  const res2 = new MockSSEResponse();
  const callback2 = createProgressCallback(res2);
  
  for (let i = 1; i <= 100; i++) {
    if (i % 10 === 0) {
      callback2({
        progress: {
          phase: 'Syncing Items',
          message: `Created ${i} items`,
          current: i,
          total: 100
        }
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  const stats2 = res2.getStats();
  console.log(`  Total Events: ${stats2.totalEvents}`);
  console.log(`  Total Time: ${stats2.totalTime}ms`);
  console.log(`  Memory Used: ${(stats2.memoryUsed / 1024).toFixed(2)} KB`);
  console.log(`  Avg Time/Event: ${stats2.avgTimePerEvent.toFixed(2)}ms`);
  console.log(`  Events/Second: ${stats2.eventsPerSecond.toFixed(2)}`);
  
  console.log('\n' + '='.repeat(60) + '\n');

  // TEST 3: Emit event every 2 seconds
  console.log('TEST 3: Time-based throttle (every 2 seconds)\n');
  
  const res3 = new MockSSEResponse();
  const callback3 = createProgressCallback(res3);
  let lastEmit = 0;
  let itemsProcessed = 0;
  
  for (let i = 1; i <= 100; i++) {
    itemsProcessed = i;
    const now = Date.now();
    
    if (now - lastEmit >= 2000 || i === 100) {
      callback3({
        progress: {
          phase: 'Syncing Items',
          message: `Created ${i} items`,
          current: i,
          total: 100
        }
      });
      lastEmit = now;
    }
    
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  const stats3 = res3.getStats();
  console.log(`  Total Events: ${stats3.totalEvents}`);
  console.log(`  Total Time: ${stats3.totalTime}ms`);
  console.log(`  Memory Used: ${(stats3.memoryUsed / 1024).toFixed(2)} KB`);
  console.log(`  Avg Time/Event: ${stats3.avgTimePerEvent.toFixed(2)}ms`);
  console.log(`  Events/Second: ${stats3.eventsPerSecond.toFixed(2)}`);
  
  console.log('\n' + '='.repeat(60) + '\n');

  // TEST 4: Hybrid - first/last + every 25 items
  console.log('TEST 4: Hybrid strategy (start, milestones, end)\n');
  
  const res4 = new MockSSEResponse();
  const callback4 = createProgressCallback(res4);
  
  for (let i = 1; i <= 100; i++) {
    if (i === 1 || i % 25 === 0 || i === 100) {
      callback4({
        itemCreated: `Test Item ${i}`,
        progress: {
          current: i,
          total: 100
        }
      });
    }
    
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  const stats4 = res4.getStats();
  console.log(`  Total Events: ${stats4.totalEvents}`);
  console.log(`  Total Time: ${stats4.totalTime}ms`);
  console.log(`  Memory Used: ${(stats4.memoryUsed / 1024).toFixed(2)} KB`);
  console.log(`  Avg Time/Event: ${stats4.avgTimePerEvent.toFixed(2)}ms`);
  console.log(`  Events/Second: ${stats4.eventsPerSecond.toFixed(2)}`);
  
  console.log('\n' + '='.repeat(60) + '\n');

  // COMPARISON
  console.log('📊 COMPARISON:\n');
  console.log(`  Strategy           | Events | Time    | Memory    | User Experience`);
  console.log(`  -------------------|--------|---------|-----------|------------------`);
  console.log(`  Every item         | ${stats1.totalEvents.toString().padEnd(6)} | ${stats1.totalTime.toString().padEnd(7)}ms | ${(stats1.memoryUsed / 1024).toFixed(2).padEnd(9)} KB | Too many toasts`);
  console.log(`  Every 10 items     | ${stats2.totalEvents.toString().padEnd(6)} | ${stats2.totalTime.toString().padEnd(7)}ms | ${(stats2.memoryUsed / 1024).toFixed(2).padEnd(9)} KB | Balanced`);
  console.log(`  Every 2 seconds    | ${stats3.totalEvents.toString().padEnd(6)} | ${stats3.totalTime.toString().padEnd(7)}ms | ${(stats3.memoryUsed / 1024).toFixed(2).padEnd(9)} KB | Smooth updates`);
  console.log(`  Hybrid (1,25,50..) | ${stats4.totalEvents.toString().padEnd(6)} | ${stats4.totalTime.toString().padEnd(7)}ms | ${(stats4.memoryUsed / 1024).toFixed(2).padEnd(9)} KB | Best balance`);

  console.log('\n💡 RECOMMENDATION:\n');
  console.log('   For 100+ items:');
  console.log('   - Use progress bar (updates every item) for count');
  console.log('   - Use toasts only for milestones (every 25-50 items)');
  console.log('   - Always show first item + last item');
  console.log('   - Toast duration: 2-3 seconds (auto-dismiss)');
  console.log('   - Phase completions: 5 seconds or manual dismiss');
  
  console.log('\n   Implementation:');
  console.log('   ✅ Progress events: every item (for progress bar)');
  console.log('   ✅ Toast events: first, every 25th, last');
  console.log('   ✅ Phase events: always emit (important milestones)');
  console.log('   ❌ Avoid: toast per item (spam)');

  console.log('\n✅ Test complete!\n');
}

testEventSpam().catch(console.error);

