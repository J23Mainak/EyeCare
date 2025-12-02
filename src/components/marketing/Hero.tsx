import { useState, useEffect } from "react";
import { Eye, Activity, Calendar, LayoutDashboard, ScanEye, Bot, Scan, Search } from "lucide-react";

export const Hero = () => {
  const [titleText, setTitleText] = useState("");
  const [subtitleText, setSubtitleText] = useState("");
  const fullTitle = "Retinal Insights for Early Diabetic Risk Detection";
  const fullSubtitle =
    "Upload fundus images, get stage suggestions, track progress, and book top-rated ophthalmologists nearby.";

  useEffect(() => {
    let titleIndex = 0;
    const titleInterval = setInterval(() => {
      if (titleIndex <= fullTitle.length) {
        setTitleText(fullTitle.slice(0, titleIndex));
        titleIndex++;
      } else {
        clearInterval(titleInterval);
      }
    }, 30);

    const subtitleTimeout = setTimeout(() => {
      let subtitleIndex = 0;
      const subtitleInterval = setInterval(() => {
        if (subtitleIndex <= fullSubtitle.length) {
          setSubtitleText(fullSubtitle.slice(0, subtitleIndex));
          subtitleIndex++;
        } else {
          clearInterval(subtitleInterval);
        }
      }, 15);
    }, fullTitle.length * 30 + 200);

    return () => {
      clearInterval(titleInterval);
      clearTimeout(subtitleTimeout);
    };
  }, []);

  return (
    <section className="relative overflow-hidden min-h-screen flex items-center">
      {/* Animated Background with Dynamic Gradients */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-teal-50/40 to-cyan-50/30" />

        {/* Large animated gradient orbs */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-br from-teal-300/40 to-teal-400/30 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-gradient-to-br from-cyan-300/30 to-teal-200/30 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-r from-teal-200/30 via-cyan-200/20 to-transparent rounded-full blur-3xl"
          style={{ animation: "spin-slow 40s linear infinite" }}
        />

        {/* Eye-inspired concentric circles */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute top-1/4 right-1/4 w-64 h-64 border-4 border-teal-500 rounded-full"
            style={{ animation: "pulse-ring 3s ease-in-out infinite" }}
          />
          <div
            className="absolute top-1/4 right-1/4 w-48 h-48 border-4 border-teal-400 rounded-full"
            style={{ animation: "pulse-ring 3s ease-in-out infinite 0.5s" }}
          />
          <div
            className="absolute bottom-1/4 left-1/4 w-56 h-56 border-4 border-cyan-400 rounded-full"
            style={{ animation: "pulse-ring 4s ease-in-out infinite 1s" }}
          />
        </div>

        {/* Wave patterns */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute bottom-0 left-0 right-0 h-32"
            style={{
              background:
                "radial-gradient(ellipse at bottom, rgba(20, 184, 166, 0.3) 0%, transparent 70%)",
              animation: "wave 8s ease-in-out infinite",
            }}
          />
          <div
            className="absolute top-0 left-0 right-0 h-32"
            style={{
              background:
                "radial-gradient(ellipse at top, rgba(6, 182, 212, 0.3) 0%, transparent 70%)",
              animation: "wave 10s ease-in-out infinite 2s",
            }}
          />
        </div>
      </div>

      {/* Medical Grid Pattern */}
      <div className="absolute inset-0 -z-5 overflow-hidden pointer-events-none opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(20, 184, 166, 0.3) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(20, 184, 166, 0.3) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
            animation: "grid-move 20s linear infinite",
          }}
        />
      </div>

      {/* Animated scan lines effect */}
      <div className="absolute inset-0 -z-5 overflow-hidden pointer-events-none opacity-5">
        <div
          className="absolute w-full h-1 bg-gradient-to-r from-transparent via-teal-500 to-transparent"
          style={{ animation: "scan-vertical 6s linear infinite" }}
        />
        <div
          className="absolute w-1 h-full bg-gradient-to-b from-transparent via-teal-400 to-transparent"
          style={{ animation: "scan-horizontal 8s linear infinite" }}
        />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 text-center relative">
        <div className="mx-auto max-w-4xl">
          {/* Animated Title */}
          <h1 className="text-4xl md:text-7xl font-bold tracking-tight min-h-[120px] md:min-h-[200px] bg-black/80 bg-clip-text text-transparent leading-tight">
            {titleText}
            <span
              style={{ animation: "blink 1s step-end infinite" }}
              className="text-teal-600"
            >
              |
            </span>
          </h1>

          {/* Animated Subtitle */}
          <p
            className="mt-6 text-lg md:text-xl text-gray-600 min-h-[60px] opacity-0 max-w-3xl mx-auto"
            style={{ animation: "fade-in-up 0.8s ease-out 2s forwards" }}
          >
            {subtitleText}
          </p>

          {/* Animated Buttons */}
          <div
            className="mt-10 flex items-center justify-center gap-5 opacity-0 flex-wrap"
            style={{ animation: "fade-in-up 0.8s ease-out 3s forwards" }}
          >
            <button className="px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 rounded-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
              Get started
            </button>
            <button className="px-8 py-4 text-lg font-semibold text-teal-700 bg-white hover:bg-gray-50 rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 border-2 border-teal-600">
              View dashboard
            </button>
          </div>
        </div>

        {/* Enhanced Feature Cards in 3 Rows */}
        <div
          className="mt-16 md:mt-24 opacity-0 max-w-3xl mx-auto"
          style={{ animation: "fade-in-up 0.8s ease-out 3.5s forwards" }}
        >
          <div className="space-y-6">
            <FeatureCard
              icon={<LayoutDashboard className="w-12 h-12 text-teal-600" />}
              title="Personalized Dashboard"
              desc="5-stage assessment with templated reports powered by advanced AI analysis for accurate diabetic retinopathy detection."
              delay="4s"
            />

            <FeatureCard
              icon={<ScanEye className="w-12 h-12 text-teal-600" />}
              title="DR Screening"
              desc="5-stage assessment with templated reports powered by advanced AI analysis for accurate diabetic retinopathy detection."
              delay="4s"
            />

            <FeatureCard
              icon={<Search className="w-12 h-12 text-teal-600" />}
              title="Doctor Finder"
              desc="Find the best ophthalmologists near you with intelligent filters for experience, degrees, ratings, and specializations."
              delay="4.3s"
            />

            <FeatureCard
              icon={<Bot className="w-12 h-12 text-teal-600" />}
              title="EyeCare Assistant"
              desc="5-stage assessment with templated reports powered by advanced AI analysis for accurate diabetic retinopathy detection."
              delay="4s"
            />

            <FeatureCard
              icon={<Calendar className="w-12 h-12 text-teal-600" />}
              title="Care Reminders"
              desc="Never miss medicine schedules, checkups and follow-ups with personalized smart notifications and care tracking."
              delay="4.6s"
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes wave {
          0%, 100% {
            transform: translateY(0) scaleY(1);
          }
          50% {
            transform: translateY(-20px) scaleY(1.1);
          }
        }
        
        @keyframes grid-move {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(50px, 50px);
          }
        }
        
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes spin-slow {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        
        @keyframes pulse-ring {
          0% {
            transform: scale(0.7);
            opacity: 1;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.3;
          }
          100% {
            transform: scale(0.7);
            opacity: 1;
          }
        }
        
        @keyframes scan-vertical {
          0% { top: -10%; }
          100% { top: 110%; }
        }
        
        @keyframes scan-horizontal {
          0% { left: -10%; }
          100% { left: 110%; }
        }
        
        @keyframes card-glow {
          0%, 100% {
            box-shadow: 0 10px 40px rgba(20, 184, 166, 0.1);
          }
          50% {
            box-shadow: 0 10px 60px rgba(20, 184, 166, 0.2);
          }
        }
      `}</style>
    </section>
  );
};

const FeatureCard = ({
  icon,
  title,
  desc,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  delay: string;
}) => (
  <div
    className="flex items-start gap-5 p-8 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl border border-gray-100 hover:border-teal-200 group opacity-0 transition-all duration-500 hover:-translate-y-2"
    style={{
      animation: `fade-in-up 0.8s ease-out ${delay} forwards, card-glow 3s ease-in-out infinite`,
      borderLeft: "6px solid #14b8a6",
    }}
  >
    <div className="flex-shrink-0 p-4 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg group-hover:shadow-xl">
      {icon}
    </div>
    <div className="text-left flex-1">
      <h3 className="font-bold text-2xl text-gray-900 group-hover:text-teal-700 transition-colors duration-300 mb-3">
        {title}
      </h3>
      <p className="text-base text-gray-600 leading-relaxed">{desc}</p>
    </div>
  </div>
);
