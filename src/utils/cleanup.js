import { Dealer, Deal, Message } from '@/api/entities';

// Utility function to clean up duplicate "Uncategorized" or "General Inbox" dealers
export function cleanupDuplicateDealers(dealers) {
  // This function now just filters and renames dealers in memory
  // Returns the cleaned dealers array
  
  const systemDealers = dealers.filter(d => 
    d.name?.includes('Uncategorized') || 
    d.name?.includes('General Inbox') ||
    d.name?.match(/\([a-z0-9]{7}\)/) || // Match the pattern (9qb207z)
    d.name?.match(/Uncategorized \([a-z0-9]{7}\)/) || // Match "Uncategorized (abc123d)"
    d.name === 'Uncategorized (9qb207z)' // Exact match for the specific one
  );
  
  // Don't automatically clean up dealers - just return them as-is
  // Let the user manually organize their dealers
  return dealers;
}
  
  // Keep the first one, mark others for removal
  const [keepDealer, ...duplicates] = systemDealers;
  
  // Rename the kept dealer to "General Inbox" if it's not already
  if (keepDealer.name !== 'General Inbox') {
    keepDealer.name = 'General Inbox';
    keepDealer.notes = 'System inbox for messages that don\'t match any specific deals. You can organize these messages later.';
  }
  
  // Return dealers array with duplicates removed
  return dealers.filter(d => !duplicates.some(dup => dup.id === d.id));
}

// Async function for actual database cleanup (separate from the sync filter function)
export async function performDealerCleanup() {
  try {
    console.log('Starting dealer cleanup...');
    
    // Find all dealers with names that indicate they're system-generated
    const dealers = await Dealer.list();
    const systemDealers = dealers.filter(d => 
      d.name?.includes('Uncategorized') || 
      d.name?.includes('General Inbox') ||
      d.name?.match(/\([a-z0-9]{7}\)/) || // Match the pattern (9qb207z)
      d.name?.match(/Uncategorized \([a-z0-9]{7}\)/) || // Match "Uncategorized (abc123d)"
      d.name === 'Uncategorized (9qb207z)' // Exact match for the specific one
    );
    
    console.log('Found system dealers:', systemDealers.length);
    console.log('System dealers found:', systemDealers.map(d => d.name));
    
    if (systemDealers.length <= 1) {
      // Even if only one, rename it if it's not "General Inbox"
      if (systemDealers.length === 1 && systemDealers[0].name !== 'General Inbox') {
        console.log('Renaming single system dealer to General Inbox');
        await Dealer.update(systemDealers[0].id, { 
          name: 'General Inbox',
          notes: 'System inbox for messages that don\'t match any specific deals. You can organize these messages later.'
        });
        return { cleaned: 0, renamed: 1 };
      }
      console.log('No cleanup needed');
      return { cleaned: 0, renamed: 0 };
    }
    
    // Keep the first one, delete the rest
    const [keepDealer, ...deleteDealers] = systemDealers;
    
    // Rename the kept dealer to "General Inbox" if it's not already
    if (keepDealer.name !== 'General Inbox') {
      console.log('Renaming kept dealer to "General Inbox"');
      await Dealer.update(keepDealer.id, { 
        name: 'General Inbox',
        notes: 'System inbox for messages that don\'t match any specific deals. You can organize these messages later.'
      });
    }
    
    console.log('Keeping dealer:', keepDealer.name, keepDealer.id);
    console.log('Deleting dealers:', deleteDealers.map(d => `${d.name} (${d.id})`));
    
    let cleanedCount = 0;
    
    for (const dealer of deleteDealers) {
      try {
        // Check if this dealer has any deals
        const deals = await Deal.filter({ dealer_id: dealer.id });
        
        if (deals.length > 0) {
          console.log(`Dealer ${dealer.name} has ${deals.length} deals, migrating to kept dealer...`);
          
          // Migrate deals to the kept dealer
          for (const deal of deals) {
            await Deal.update(deal.id, { dealer_id: keepDealer.id });
          }
        }
        
        // Check if this dealer has any messages
        const messages = await Message.filter({ dealer_id: dealer.id });
        
        if (messages.length > 0) {
          console.log(`Dealer ${dealer.name} has ${messages.length} messages, migrating to kept dealer...`);
          
          // Migrate messages to the kept dealer
          for (const message of messages) {
            await Message.update(message.id, { dealer_id: keepDealer.id });
          }
        }
        
        // Now safe to delete the duplicate dealer
        await Dealer.delete(dealer.id);
        cleanedCount++;
        console.log(`Deleted duplicate dealer: ${dealer.name}`);
        
      } catch (error) {
        console.error(`Failed to clean up dealer ${dealer.name}:`, error);
      }
    }
    
    console.log(`Cleanup complete. Removed ${cleanedCount} duplicate dealers.`);
    return { cleaned: cleanedCount, kept: keepDealer };
    
  } catch (error) {
    console.error('Cleanup failed:', error);
    throw error;
  }
}