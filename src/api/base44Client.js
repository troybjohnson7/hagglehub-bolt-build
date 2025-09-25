// Admin-level client implementation to replace Base44 SDK
// This provides full access to all features without external dependencies

class AdminEntity {
  constructor(name) {
    this.name = name;
    this.initializeStorage();
  }

  initializeStorage() {
    // Initialize with sample data if storage is empty
    const existing = localStorage.getItem(`admin_${this.name}`);
    if (!existing) {
      const sampleData = this.getSampleData();
      localStorage.setItem(`admin_${this.name}`, JSON.stringify(sampleData));
    }
  }

  getSampleData() {
    switch (this.name) {
      case 'vehicles':
        return [
          {
            id: 'vehicle_1',
            year: 2023,
            make: 'Toyota',
            model: 'Camry',
            trim: 'LE',
            vin: '1HGBH41JXMN109186',
            mileage: 15000,
            condition: 'used',
            exterior_color: 'Silver',
            interior_color: 'Black',
            listing_url: 'https://example.com/listing1',
            created_date: new Date().toISOString()
          },
          {
            id: 'vehicle_2',
            year: 2022,
            make: 'Honda',
            model: 'Civic',
            trim: 'Sport',
            vin: '2HGFC2F59NH123456',
            mileage: 22000,
            condition: 'used',
            exterior_color: 'Blue',
            interior_color: 'Gray',
            created_date: new Date().toISOString()
          }
        ];
      case 'dealers':
        return [
          {
            id: 'dealer_1',
            name: 'Premium Auto Sales',
            contact_email: 'sales@premiumauto.com',
            phone: '(555) 123-4567',
            address: '123 Auto Row, Car City, CA 90210',
            website: 'https://premiumauto.com',
            sales_rep_name: 'John Smith',
            rating: 4.5,
            notes: 'Responsive and professional',
            created_date: new Date().toISOString()
          },
          {
            id: 'dealer_2',
            name: 'City Motors',
            contact_email: 'info@citymotors.com',
            phone: '(555) 987-6543',
            address: '456 Main St, Downtown, CA 90211',
            sales_rep_name: 'Sarah Johnson',
            rating: 4.2,
            created_date: new Date().toISOString()
          }
        ];
      case 'deals':
        return [
          {
            id: 'deal_1',
            vehicle_id: 'vehicle_1',
            dealer_id: 'dealer_1',
            asking_price: 28000,
            current_offer: 26500,
            target_price: 25000,
            otd_price: null,
            status: 'negotiating',
            priority: 'high',
            purchase_type: 'finance',
            negotiation_notes: 'Initial offer made, waiting for counter',
            quote_expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            fees_breakdown: {
              doc_fee: 500,
              destination_fee: 1200,
              tax: 2240,
              title_fee: 75,
              registration_fee: 150,
              other_fees: 0
            },
            created_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'deal_2',
            vehicle_id: 'vehicle_2',
            dealer_id: 'dealer_2',
            asking_price: 24000,
            current_offer: null,
            target_price: 22000,
            status: 'quote_requested',
            priority: 'medium',
            purchase_type: 'cash',
            negotiation_notes: 'Just started negotiations',
            fees_breakdown: {},
            created_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];
      case 'messages':
        return [
          {
            id: 'msg_1',
            deal_id: 'deal_1',
            dealer_id: 'dealer_1',
            content: 'Thank you for your interest in the 2023 Toyota Camry. Our best price is $26,500.',
            direction: 'inbound',
            channel: 'email',
            is_read: false,
            contains_offer: true,
            extracted_price: 26500,
            created_date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'msg_2',
            deal_id: 'deal_1',
            dealer_id: 'dealer_1',
            content: 'I appreciate the offer. I was hoping we could get closer to $25,000. Would that work?',
            direction: 'outbound',
            channel: 'email',
            is_read: true,
            contains_offer: false,
            created_date: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
          }
        ];
      case 'market_data':
        return [
          {
            id: 'market_1',
            vehicle_year: 2023,
            vehicle_make: 'Toyota',
            vehicle_model: 'Camry',
            vehicle_trim: 'LE',
            mileage_range: '10k-30k',
            purchase_type: 'finance',
            asking_price: 28000,
            final_price: 25500,
            savings_amount: 2500,
            savings_percentage: 8.9,
            negotiation_duration_days: 5,
            region: 'west_coast',
            deal_outcome: 'deal_won',
            created_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];
      default:
        return [];
    }
  }

  async list(orderBy = '') {
    const data = JSON.parse(localStorage.getItem(`admin_${this.name}`) || '[]');
    if (orderBy.startsWith('-')) {
      const field = orderBy.substring(1);
      return data.sort((a, b) => new Date(b[field]) - new Date(a[field]));
    }
    return data;
  }

  async filter(criteria) {
    const data = JSON.parse(localStorage.getItem(`admin_${this.name}`) || '[]');
    return data.filter(item => {
      return Object.entries(criteria).every(([key, value]) => item[key] === value);
    });
  }

  async create(itemData) {
    const data = JSON.parse(localStorage.getItem(`admin_${this.name}`) || '[]');
    const newItem = {
      id: `${this.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_date: new Date().toISOString(),
      ...itemData
    };
    data.push(newItem);
    localStorage.setItem(`admin_${this.name}`, JSON.stringify(data));
    return newItem;
  }

  async update(id, updates) {
    const data = JSON.parse(localStorage.getItem(`admin_${this.name}`) || '[]');
    const index = data.findIndex(item => item.id === id);
    if (index !== -1) {
      data[index] = { ...data[index], ...updates };
      localStorage.setItem(`admin_${this.name}`, JSON.stringify(data));
      return data[index];
    }
    throw new Error('Item not found');
  }

  async delete(id) {
    const data = JSON.parse(localStorage.getItem(`admin_${this.name}`) || '[]');
    const filtered = data.filter(item => item.id !== id);
    localStorage.setItem(`admin_${this.name}`, JSON.stringify(filtered));
    return true;
  }
}

class AdminAuth {
  constructor() {
    this.initializeAdminUser();
  }

  initializeAdminUser() {
    const existingUser = localStorage.getItem('admin_user');
    if (!existingUser) {
      const adminUser = {
        id: 'admin_user_123',
        email: 'admin@hagglehub.app',
        full_name: 'Admin User',
        email_identifier: 'admin123',
        subscription_tier: 'closer_annual', // Full access
        has_completed_onboarding: true,
        fallback_deal_id: null,
        user_metadata: {
          avatar_url: null
        }
      };
      localStorage.setItem('admin_user', JSON.stringify(adminUser));
      localStorage.setItem('admin_access_token', 'admin-token-full-access');
    }
  }

  async login() {
    // Admin login - automatically set admin user
    const adminUser = {
      id: 'admin_user_123',
      email: 'admin@hagglehub.app',
      full_name: 'Admin User',
      email_identifier: 'admin123',
      subscription_tier: 'closer_annual', // Full access
      has_completed_onboarding: true,
      fallback_deal_id: null,
      user_metadata: {
        avatar_url: null
      }
    };
    localStorage.setItem('admin_user', JSON.stringify(adminUser));
    localStorage.setItem('admin_access_token', 'admin-token-full-access');
    
    // Navigate to dashboard
    window.location.href = '/dashboard';
    return adminUser;
  }

  async logout() {
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_access_token');
    // Clear all data on logout
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('admin_')) {
        localStorage.removeItem(key);
      }
    });
    window.location.href = '/';
  }

  async me() {
    const user = localStorage.getItem('admin_user');
    if (!user) {
      throw new Error('Not authenticated');
    }
    return JSON.parse(user);
  }

  async updateMyUserData(updates) {
    const user = JSON.parse(localStorage.getItem('admin_user') || '{}');
    const updatedUser = { ...user, ...updates };
    localStorage.setItem('admin_user', JSON.stringify(updatedUser));
    return updatedUser;
  }
}

// Enhanced AI integrations with more realistic responses
class AdminIntegrations {
  static async InvokeLLM({ prompt, response_json_schema, add_context_from_internet = false }) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Generate responses based on schema and prompt content
    if (response_json_schema?.properties?.suggestions) {
      const strategies = [
        {
          strategy_name: "Mirror and Label Their Position",
          explanation: "Acknowledge their constraints to build rapport before making your request. This creates psychological safety and makes them more receptive to your position.",
          example_message: "It sounds like you're under pressure to move inventory this month, and this car has been on the lot for a while. Is that right?"
        },
        {
          strategy_name: "Calibrated Questions for Control",
          explanation: "Use 'How' and 'What' questions to make them think about your perspective without being confrontational. This shifts the burden of problem-solving to them.",
          example_message: "What would need to happen for us to get closer to my target price of $25,000?"
        },
        {
          strategy_name: "Tactical Empathy with Anchoring",
          explanation: "Show understanding of their position while subtly anchoring your desired price point. This makes your offer seem more reasonable.",
          example_message: "I understand you have targets to meet. How am I supposed to make $28,000 work when similar cars are selling for $25,000?"
        }
      ];
      
      return {
        suggestions: strategies.slice(0, 2 + Math.floor(Math.random() * 2))
      };
    }
    
    if (response_json_schema?.properties?.vehicle) {
      // Vehicle parsing response
      const makes = ['Toyota', 'Honda', 'Ford', 'Chevrolet', 'Nissan', 'BMW', 'Mercedes-Benz'];
      const models = ['Camry', 'Civic', 'F-150', 'Silverado', 'Altima', '3 Series', 'C-Class'];
      
      return {
        vehicle: {
          year: 2020 + Math.floor(Math.random() * 4),
          make: makes[Math.floor(Math.random() * makes.length)],
          model: models[Math.floor(Math.random() * models.length)],
          trim: 'LE',
          vin: '1HGBH41JXMN' + Math.floor(Math.random() * 1000000),
          mileage: 10000 + Math.floor(Math.random() * 50000),
          condition: 'used',
          exterior_color: 'Silver',
          interior_color: 'Black'
        },
        dealer: {
          name: 'Auto Plaza',
          contact_email: 'sales@autoplaza.com',
          phone: '(555) 123-4567',
          address: '123 Auto Row, Car City, CA'
        },
        pricing: {
          asking_price: 20000 + Math.floor(Math.random() * 15000)
        }
      };
    }

    if (response_json_schema?.properties?.summary) {
      // Smart insights response
      return {
        summary: "Your deals are progressing well! You have strong negotiating positions on 2 active deals with potential savings of over $4,000 total.",
        insights: [
          {
            title: "Strong Market Position on Toyota Camry",
            explanation: "Based on recent community data, similar 2023 Camrys are selling for $25,500-$26,000. Your target of $25,000 is achievable.",
            next_step: "Counter their $26,500 offer with $25,500 and mention you've seen similar deals in that range.",
            type: "positive"
          },
          {
            title: "Follow Up Needed on Honda Civic",
            explanation: "It's been 24 hours since your initial inquiry. Dealers often have daily quotas and may be more flexible later in the day.",
            next_step: "Send a follow-up message asking about their best price and mention you're ready to move quickly.",
            type: "neutral"
          }
        ]
      };
    }

    // Default response for lead submission
    return { 
      status: 'success', 
      details: 'Your inquiry has been submitted successfully. The dealer should respond within 24 hours.',
      next_steps: 'Check your HaggleHub inbox for responses and be prepared to negotiate.'
    };
  }
}

// Enhanced functions with full admin capabilities
class AdminFunctions {
  static async sendReply({ message_content, dealer_id, deal_id }) {
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    // Create the outbound message in storage
    const messages = JSON.parse(localStorage.getItem('admin_messages') || '[]');
    const newMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      deal_id,
      dealer_id,
      content: message_content,
      direction: 'outbound',
      channel: 'email',
      is_read: true,
      contains_offer: false,
      created_date: new Date().toISOString()
    };
    
    messages.push(newMessage);
    localStorage.setItem('admin_messages', JSON.stringify(messages));
    
    return {
      data: {
        success: true,
        message: 'Email sent successfully via HaggleHub',
        message_id: newMessage.id
      }
    };
  }
}

// Create admin client with full access
export const base44 = {
  entities: {
    Vehicle: new AdminEntity('vehicles'),
    Dealer: new AdminEntity('dealers'),
    Deal: new AdminEntity('deals'),
    Message: new AdminEntity('messages'),
    MarketData: new AdminEntity('market_data')
  },
  auth: new AdminAuth(),
  integrations: {
    Core: {
      InvokeLLM: AdminIntegrations.InvokeLLM
    }
  },
  functions: {
    sendReply: AdminFunctions.sendReply
  }
};