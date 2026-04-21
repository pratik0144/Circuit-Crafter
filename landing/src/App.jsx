import Navbar from './components/Navbar';
import Background from './components/Background';
import Hero from './components/Hero';
import Features from './components/Features';
import InteractivePreview from './components/InteractivePreview';
import WhySection from './components/WhySection';
import CTA from './components/CTA';
import Footer from './components/Footer';

export default function App() {
  return (
    <>
      <Background />
      <Navbar />
      <main>
        <Hero />
        <Features />
        <InteractivePreview />
        <WhySection />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
