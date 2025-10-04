import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/pages/Layout'
import IndexPage from '@/pages/Index'
import AboutPage from '@/pages/About'
import PrivacyPolicyPage from '@/pages/PrivacyPolicy'
import TermsOfServicePage from '@/pages/TermsOfService'
import Dashboard from '@/pages/Dashboard'
import AddVehiclePage from '@/pages/AddVehicle'
import MessagesPage from '@/pages/Messages'
import AccountPage from '@/pages/Account'
import DealDetailsPage from '@/pages/DealDetails'
import EditDealPage from '@/pages/EditDeal'
import EditDealerPage from '@/pages/EditDealer'
import OnboardingPage from '@/pages/onboarding'
import NotFound from '@/pages/NotFound'
import { Toaster } from "@/components/ui/toaster"

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout currentPageName="Index"><IndexPage /></Layout>} />
        <Route path="/about" element={<Layout currentPageName="About"><AboutPage /></Layout>} />
        <Route path="/privacy-policy" element={<Layout currentPageName="PrivacyPolicy"><PrivacyPolicyPage /></Layout>} />
        <Route path="/terms-of-service" element={<Layout currentPageName="TermsOfService"><TermsOfServicePage /></Layout>} />
        <Route path="/dashboard" element={<Layout currentPageName="Dashboard"><Dashboard /></Layout>} />
        <Route path="/add-vehicle" element={<Layout currentPageName="AddVehicle"><AddVehiclePage /></Layout>} />
        <Route path="/messages" element={<Layout currentPageName="Messages"><MessagesPage /></Layout>} />
        <Route path="/account" element={<Layout currentPageName="Account"><AccountPage /></Layout>} />
        <Route path="/deal-details" element={<Layout currentPageName="DealDetails"><DealDetailsPage /></Layout>} />
        <Route path="/edit-deal" element={<Layout currentPageName="EditDeal"><EditDealPage /></Layout>} />
        <Route path="/edit-dealer" element={<Layout currentPageName="EditDealer"><EditDealerPage /></Layout>} />
        <Route path="/edit-dealer/:dealerId" element={<Layout currentPageName="EditDealer"><EditDealerPage /></Layout>} />
        <Route path="/onboarding" element={<Layout currentPageName="Onboarding"><OnboardingPage /></Layout>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </Router>
  )
}

export default App 