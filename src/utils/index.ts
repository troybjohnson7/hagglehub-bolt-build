


export function createPageUrl(pageName: string) {
    // Handle specific page name mappings
    const pageMap: { [key: string]: string } = {
        'AddVehicle': '/add-vehicle',
        'DealDetails': '/deal-details',
        'EditDeal': '/edit-deal',
        'EditDealer': '/edit-dealer',
        'PrivacyPolicy': '/privacy-policy',
        'TermsOfService': '/terms-of-service'
    };
    
    if (pageMap[pageName]) {
        return pageMap[pageName];
    }
    
    return '/' + pageName.toLowerCase().replace(/ /g, '-');
}