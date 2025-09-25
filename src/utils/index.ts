


export function createPageUrl(pageName: string) {
    console.log('createPageUrl called with:', pageName);
    
    // Handle specific page name mappings
    const pageMap: { [key: string]: string } = {
        'AddVehicle': '/add-vehicle',
        'DealDetails': '/deal-details',
        'EditDeal': '/edit-deal',
        'EditDealer': '/edit-dealer',
        'PrivacyPolicy': '/privacy-policy',
        'TermsOfService': '/terms-of-service'
    };
    
    // Handle query parameters for DealDetails
    if (pageName.startsWith('DealDetails?')) {
        const queryPart = pageName.substring('DealDetails'.length);
        const result = '/deal-details' + queryPart;
        console.log('DealDetails URL result:', result);
        return result;
    }
    
    if (pageMap[pageName]) {
        console.log('Found in pageMap:', pageMap[pageName]);
        return pageMap[pageName];
    }
    
    const result = '/' + pageName.toLowerCase().replace(/ /g, '-');
    console.log('Default URL result:', result);
    return result;
}