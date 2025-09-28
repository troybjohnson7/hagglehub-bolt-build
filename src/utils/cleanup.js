import { Dealer, Deal, Message } from '@/api/entities';

// Utility function to clean up duplicate "Uncategorized" or "General Inbox" dealers
export async function cleanupDuplicateDealers() {
  try {
    console.log('Starting dealer cleanup...');
    
    // Find all dealers with names that indicate they're system-generated
    const dealers = await Dealer.list();
    const systemDealers = dealers.filter(d => 
      d.name?.includes('Uncategorized') || 
      d.name?.includes('General Inbox') ||
      d.name?.match(/\([a-z0-9]{7}\)/) || // Match the pattern (9qb207z)
      d.name?.match(/Uncategorized \([a-z0-9]{7}\)/) // Match "Uncategorized (abc123d)"
    );
    
    console.log('Found system dealers:', systemDealers.length);
    
    if (systemDealers.length <= 1) {
      console.log('No duplicates to clean up');
      return { cleaned: 0 };
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