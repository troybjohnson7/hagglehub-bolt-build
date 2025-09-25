// Mock Base44 client to replace the actual SDK
// This preserves the same API interface but uses local storage for data

class MockEntity {
  constructor(name) {
    this.name = name;
  }

  async list(orderBy = '') {
    const data = JSON.parse(localStorage.getItem(`mock_${this.name}`) || '[]');
    if (orderBy.startsWith('-')) {
      const field = orderBy.substring(1);
      return data.sort((a, b) => new Date(b[field]) - new Date(a[field]));
    }
    return data;
  }

  async filter(criteria) {
    const data = JSON.parse(localStorage.getItem(`mock_${this.name}`) || '[]');
    return data.filter(item => {
      return Object.entries(criteria).every(([key, value]) => item[key] === value);
    });
  }

  async create(itemData) {
    const data = JSON.parse(localStorage.getItem(`mock_${this.name}`) || '[]');
    const newItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      created_date: new Date().toISOString(),
      ...itemData
    };
    data.push(newItem);
    localStorage.setItem(`mock_${this.name}`, JSON.stringify(data));
    return newItem;
  }

  async update(id, updates) {
    const data = JSON.parse(localStorage.getItem(`mock_${this.name}`) || '[]');
    const index = data.findIndex(item => item.id === id);
    if (index !== -1) {
      data[index] = { ...data[index], ...updates };
      localStorage.setItem(`mock_${this.name}`, JSON.stringify(data));
      return data[index];
    }
    throw new Error('Item not found');
  }

  async delete(id) {
    const data = JSON.parse(localStorage.getItem(`mock_${this.name}`) || '[]');
    const filtered = data.filter(item => item.id !== id);
    localStorage.setItem(`mock_${this.name}`, JSON.stringify(filtered));
    return true;
  }
}

class MockAuth {
  async login() {
    // Mock login - just set a flag in localStorage
    const mockUser = {
      id: 'mock-user-123',
      email: 'user@example.com',
      full_name: 'Demo User',
      email_identifier: 'demo123',
      subscription_tier: 'free',
      has_completed_onboarding: true,
      fallback_deal_id: null
    };
    localStorage.setItem('mock_user', JSON.stringify(mockUser));
    localStorage.setItem('mock_access_token', 'mock-token-123');
    window.location.reload();
  }

  async logout() {
    localStorage.removeItem('mock_user');
    localStorage.removeItem('mock_access_token');
    window.location.reload();
  }

  async me() {
    const user = localStorage.getItem('mock_user');
    if (!user) throw new Error('Not authenticated');
    return JSON.parse(user);
  }

  async updateMyUserData(updates) {
    const user = JSON.parse(localStorage.getItem('mock_user') || '{}');
    const updatedUser = { ...user, ...updates };
    localStorage.setItem('mock_user', JSON.stringify(updatedUser));
    return updatedUser;
  }
}

// Mock integrations
class MockIntegrations {
  static async InvokeLLM({ prompt, response_json_schema }) {
    // Mock AI responses based on the schema
    if (response_json_schema?.properties?.suggestions) {
      return {
        suggestions: [
          {
            strategy_name: "Build Rapport First",
            explanation: "Start by acknowledging their position and showing understanding before making your request.",
            example_message: "I understand you have targets to meet. What would need to happen for us to find a price that works for both of us?"
          },
          {
            strategy_name: "Use Calibrated Questions",
            explanation: "Ask questions that make them think about your perspective without being confrontational.",
            example_message: "How am I supposed to make this work with my budget constraints?"
          }
        ]
      };
    }
    
    if (response_json_schema?.properties?.vehicle) {
      return {
        vehicle: {
          year: 2022,
          make: "Toyota",
          model: "Camry",
          trim: "LE",
          vin: "1234567890",
          mileage: 25000
        },
        dealer: {
          name: "Demo Auto Dealer",
          contact_email: "sales@demodealer.com",
          phone: "(555) 123-4567"
        },
        pricing: {
          asking_price: 28000
        }
      };
    }

    return { status: 'success', details: 'Mock response generated' };
  }
}

// Mock functions
class MockFunctions {
  static async sendReply({ message_content, dealer_id, deal_id }) {
    return {
      data: {
        success: true,
        message: 'Mock email sent successfully'
      }
    };
  }
}

// Create mock client that matches Base44 SDK structure
export const base44 = {
  entities: {
    Vehicle: new MockEntity('vehicles'),
    Dealer: new MockEntity('dealers'),
    Deal: new MockEntity('deals'),
    Message: new MockEntity('messages'),
    MarketData: new MockEntity('market_data')
  },
  auth: new MockAuth(),
  integrations: {
    Core: {
      InvokeLLM: MockIntegrations.InvokeLLM
    }
  },
  functions: {
    sendReply: MockFunctions.sendReply
  }
};