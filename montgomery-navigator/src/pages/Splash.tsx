import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import capitolDome from "@/assets/capitol-dome.png";
import skyline from "@/assets/montgomery-skyline.png";

const Splash = () => {
  const navigate = useNavigate();
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    setTimeout(() => setFadeIn(true), 100);
    const timer = setTimeout(() => navigate("/app"), 2800);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      className="fixed inset-0 bg-primary magnolia-bg flex flex-col items-center justify-between overflow-hidden cursor-pointer"
      onClick={() => navigate("/app")}
    >
      {/* Language toggle */}
      <div className="w-full flex justify-end px-5 pt-14 relative z-10">
        <div className="flex rounded-full overflow-hidden border border-primary-foreground/30">
          <button className="px-3 py-1 text-xs font-medium bg-primary-foreground text-primary">EN</button>
          <button className="px-3 py-1 text-xs font-medium text-primary-foreground/60">ES</button>
        </div>
      </div>

      {/* Center content */}
      <div
        className={`flex flex-col items-center gap-5 flex-1 justify-center px-8 transition-all duration-1000 ${
          fadeIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <img src={capitolDome} alt="Alabama State Capitol" className="w-24 h-24 object-contain brightness-200" />
        <h1 className="text-primary-foreground text-4xl font-bold tracking-tight">MontgomeryAI</h1>
        <p className="text-primary-foreground/80 text-base text-center leading-relaxed">
          Your life. Your benefits. Your career.
          <br />
          Montgomery, AL.
        </p>
      </div>

      {/* Skyline footer */}
      <div className="w-full relative">
        <img
          src={skyline}
          alt="Montgomery Skyline"
          className={`w-full h-36 object-cover object-top transition-opacity duration-1500 ${
            fadeIn ? "opacity-30" : "opacity-0"
          }`}
        />
      </div>
    </div>
  );
};

export default Splash;
