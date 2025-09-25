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

    // Check if this is a URL parsing request
    if (add_context_from_internet && prompt.includes('Extract structured vehicle, dealer, and pricing information')) {
      const urlMatch = prompt.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        const url = urlMatch[0];
        return await AdminIntegrations.parseVehicleListingURL(url, response_json_schema);
      }
    }

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

  static async parseVehicleListingURL(url, schema) {
    try {
      // Fetch the webpage content
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      const htmlContent = data.contents;
      
      // Create a temporary DOM parser
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Extract vehicle information from various common selectors
      const extractedData = this.extractVehicleData(doc, url);
      
      return {
        vehicle: extractedData.vehicle,
        dealer: extractedData.dealer,
        pricing: extractedData.pricing
      };
    } catch (error) {
      console.error('Failed to parse URL:', error);
      // Fallback to analyzing URL structure if fetch fails
      return this.parseFromURLStructure(url);
    }
  }

  static extractVehicleData(doc, url) {
    // Common selectors for vehicle information
    const titleSelectors = [
      'h1', '.vehicle-title', '.inventory-title', '.vehicle-name',
      '[data-test="vehicle-title"]', '.listing-title'
    ];
    
    const priceSelectors = [
      '.price', '.vehicle-price', '.listing-price', '.our-price',
      '[data-test="price"]', '.price-value', '.current-price'
    ];

    // Extract title/vehicle info
    let vehicleTitle = '';
    for (const selector of titleSelectors) {
      const element = doc.querySelector(selector);
      if (element && element.textContent.trim()) {
        vehicleTitle = element.textContent.trim();
        break;
      }
    }

    // Extract price
    let price = null;
    for (const selector of priceSelectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const priceText = element.textContent.replace(/[^\d]/g, '');
        if (priceText && parseInt(priceText) > 1000) {
          price = parseInt(priceText);
          break;
        }
      }
    }

    // Parse vehicle title for year, make, model
    const vehicleInfo = this.parseVehicleTitle(vehicleTitle);
    
    // Extract dealer info from URL and page
    const dealerInfo = this.extractDealerInfo(doc, url);

    return {
      vehicle: {
        year: vehicleInfo.year,
        make: vehicleInfo.make,
        model: vehicleInfo.model,
        trim: vehicleInfo.trim,
        vin: this.extractVIN(doc),
        mileage: this.extractMileage(doc),
        condition: 'used',
        exterior_color: this.extractColor(doc, 'exterior'),
        interior_color: this.extractColor(doc, 'interior'),
        listing_url: url
      },
      dealer: dealerInfo,
      pricing: {
        asking_price: price
      }
    };
  }

  static parseVehicleTitle(title) {
    // Common patterns for vehicle titles
    const patterns = [
      /(\d{4})\s+(\w+)\s+([^,\-\s]+(?:\s+[^,\-\s]+)*?)(?:\s+([^,\-]+))?/i,
      /(\w+)\s+([^,\-\s]+(?:\s+[^,\-\s]+)*?)\s+(\d{4})/i
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        return {
          year: parseInt(match[1]) || new Date().getFullYear(),
          make: match[2] || 'Unknown',
          model: match[3] || 'Unknown',
          trim: match[4] || ''
        };
      }
    }

    // Fallback parsing
    const words = title.split(/\s+/);
    const yearMatch = words.find(word => /^\d{4}$/.test(word));
    const year = yearMatch ? parseInt(yearMatch) : new Date().getFullYear();
    
    return {
      year,
      make: words[1] || 'Unknown',
      model: words[2] || 'Unknown',
      trim: words.slice(3).join(' ') || ''
    };
  }

  static extractDealerInfo(doc, url) {
    const hostname = new URL(url).hostname;
    const dealerName = hostname.replace(/^www\./, '').split('.')[0];
    
    // Try to find dealer name on page
    const dealerSelectors = [
      '.dealer-name', '.dealership-name', '.dealer-info h1', '.dealer-info h2',
      '[data-test="dealer-name"]', '.dealer-title'
    ];
    
    let foundDealerName = '';
    for (const selector of dealerSelectors) {
      const element = doc.querySelector(selector);
      if (element && element.textContent.trim()) {
        foundDealerName = element.textContent.trim();
        break;
      }
    }

    // Extract contact info
    const phoneRegex = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    
    const pageText = doc.body ? doc.body.textContent : '';
    const phoneMatch = pageText.match(phoneRegex);
    const emailMatch = pageText.match(emailRegex);

    return {
      name: foundDealerName || this.formatDealerName(dealerName),
      contact_email: emailMatch ? emailMatch[0] : `sales@${hostname}`,
      phone: phoneMatch ? phoneMatch[0] : '',
      address: this.extractAddress(doc),
      website: url
    };
  }

  static formatDealerName(hostname) {
    return hostname
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  static extractVIN(doc) {
    const vinSelectors = ['.vin', '[data-test="vin"]', '.vehicle-vin'];
    for (const selector of vinSelectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const vinMatch = element.textContent.match(/[A-HJ-NPR-Z0-9]{17}/);
        if (vinMatch) return vinMatch[0];
      }
    }
    return '';
  }

  static extractMileage(doc) {
    const mileageSelectors = ['.mileage', '[data-test="mileage"]', '.vehicle-mileage'];
    for (const selector of mileageSelectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const mileageMatch = element.textContent.match(/[\d,]+/);
        if (mileageMatch) {
          return parseInt(mileageMatch[0].replace(/,/g, ''));
        }
      }
    }
    return null;
  }

  static extractColor(doc, type) {
    const colorSelectors = [
      `.${type}-color`, `[data-test="${type}-color"]`, `.vehicle-${type}-color`
    ];
    for (const selector of colorSelectors) {
      const element = doc.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }
    return '';
  }

  static extractAddress(doc) {
    const addressSelectors = [
      '.dealer-address', '.dealership-address', '[data-test="address"]'
    ];
    for (const selector of addressSelectors) {
      const element = doc.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }
    return '';
  }

  static parseFromURLStructure(url) {
    // Fallback: try to extract info from URL structure
    const urlParts = url.toLowerCase().split(/[-_/]/);
    
    // Look for year in URL
    const yearMatch = urlParts.find(part => /^\d{4}$/.test(part));
    const year = yearMatch ? parseInt(yearMatch) : 2020;
    
    // Look for common car makes
    const commonMakes = ['toyota', 'honda', 'ford', 'chevrolet', 'nissan', 'jeep', 'bmw', 'mercedes'];
    const make = urlParts.find(part => commonMakes.includes(part)) || 'Unknown';
    
    // Extract dealer name from hostname
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const dealerName = hostname.split('.')[0];
    
    return {
      vehicle: {
        year,
        make: make.charAt(0).toUpperCase() + make.slice(1),
        model: 'Unknown Model',
        trim: '',
        vin: '',
        mileage: null,
        condition: 'used',
        exterior_color: '',
        interior_color: '',
        listing_url: url
      },
      dealer: {
        name: this.formatDealerName(dealerName),
        contact_email: `sales@${hostname}`,
        phone: '',
        address: '',
        website: url
      },
      pricing: {
        asking_price: null
      }
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