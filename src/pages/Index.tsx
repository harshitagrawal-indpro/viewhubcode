
import { ArrowRight, CheckCircle, ShieldCheck, Clock, Smartphone } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-28 pb-16 px-4 md:px-0">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-balance">
              Real-time monitoring solution for organizational efficiency
            </h1>
            <p className="text-xl text-foreground/70 mb-8 max-w-2xl mx-auto">
              ViewHub helps organizations monitor mobile usage during work hours, improving productivity and focus.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signin"
                className="rounded-full px-8 py-3 bg-primary text-white font-medium hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:translate-y-[-2px] flex items-center justify-center gap-2"
              >
                Get Started <ArrowRight size={18} />
              </Link>
              <a
                href="#features"
                className="rounded-full px-8 py-3 bg-secondary text-foreground font-medium hover:bg-secondary/80 transition-all flex items-center justify-center"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" className="py-16 bg-primary-100">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Comprehensive Monitoring Features</h2>
            <p className="text-lg text-foreground/70">
              Everything you need to effectively monitor and manage mobile usage in your organization.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                <Smartphone size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-time Monitoring</h3>
              <p className="text-foreground/70">
                Track mobile usage in real-time during work hours with instant notifications to executors.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow animate-fade-in animation-delay-100">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                <Clock size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Schedule Management</h3>
              <p className="text-foreground/70">
                Create and manage work schedules, break times, and holidays with an auto-updating calendar.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow animate-fade-in animation-delay-200">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Customizable Controls</h3>
              <p className="text-foreground/70">
                Enable or disable monitoring for specific hours, associates, or holidays with flexible controls.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Role Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Designed for Every Role</h2>
            <p className="text-lg text-foreground/70">
              ViewHub provides tailored experiences for organizers, executors, and associates.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Organizer */}
            <div className="glass rounded-xl p-6 hover:shadow-lg transition-all animate-fade-in">
              <h3 className="text-xl font-semibold mb-4">For Organizers</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle size={18} className="text-primary mt-0.5 mr-2 flex-shrink-0" />
                  <span>Create and manage groups with unique IDs</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle size={18} className="text-primary mt-0.5 mr-2 flex-shrink-0" />
                  <span>Schedule weekly timetables and breaks</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle size={18} className="text-primary mt-0.5 mr-2 flex-shrink-0" />
                  <span>Define monitoring rules and policies</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle size={18} className="text-primary mt-0.5 mr-2 flex-shrink-0" />
                  <span>Declare holidays and special events</span>
                </li>
              </ul>
            </div>
            
            {/* Executor */}
            <div className="glass rounded-xl p-6 hover:shadow-lg transition-all animate-fade-in animation-delay-100">
              <h3 className="text-xl font-semibold mb-4">For Executors</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle size={18} className="text-primary mt-0.5 mr-2 flex-shrink-0" />
                  <span>View live mobile usage during work hours</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle size={18} className="text-primary mt-0.5 mr-2 flex-shrink-0" />
                  <span>Receive instant notifications for policy violations</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle size={18} className="text-primary mt-0.5 mr-2 flex-shrink-0" />
                  <span>Access usage history with timestamps</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle size={18} className="text-primary mt-0.5 mr-2 flex-shrink-0" />
                  <span>Enable/disable monitoring for specific cases</span>
                </li>
              </ul>
            </div>
            
            {/* Associate */}
            <div className="glass rounded-xl p-6 hover:shadow-lg transition-all animate-fade-in animation-delay-200">
              <h3 className="text-xl font-semibold mb-4">For Associates</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle size={18} className="text-primary mt-0.5 mr-2 flex-shrink-0" />
                  <span>Join groups with provided credentials</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle size={18} className="text-primary mt-0.5 mr-2 flex-shrink-0" />
                  <span>Get automated monitoring during work hours</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle size={18} className="text-primary mt-0.5 mr-2 flex-shrink-0" />
                  <span>Mark personal holidays or absences</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle size={18} className="text-primary mt-0.5 mr-2 flex-shrink-0" />
                  <span>Receive holiday notifications</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-primary/90 to-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to improve productivity?</h2>
          <p className="text-white/80 text-lg max-w-2xl mx-auto mb-8">
            Join organizations worldwide using ViewHub to create a more focused work environment.
          </p>
          <Link
            to="/signin"
            className="rounded-full px-8 py-3 bg-white text-primary font-medium hover:bg-white/90 transition-all shadow-lg inline-block"
          >
            Get Started Now
          </Link>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default Index;
