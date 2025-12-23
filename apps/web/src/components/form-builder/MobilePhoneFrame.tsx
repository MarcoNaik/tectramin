"use client";

import { useState, useEffect } from "react";

interface MobilePhoneFrameProps {
  children: React.ReactNode;
}

export function MobilePhoneFrame({ children }: MobilePhoneFrameProps) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <div
        className="relative rounded-[46px]"
        style={{
          background: "linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)",
          padding: "4px",
          boxShadow: `
            0 25px 50px -12px rgba(0,0,0,0.4),
            0 12px 24px -8px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.08)
          `
        }}
      >
        <div
          className="absolute -left-[2px] top-[100px] w-[4px] h-[28px] rounded-l-full"
          style={{ background: "linear-gradient(90deg, #2a2a2a 0%, #1a1a1a 100%)" }}
        />
        <div
          className="absolute -left-[2px] top-[145px] w-[4px] h-[55px] rounded-l-full"
          style={{ background: "linear-gradient(90deg, #2a2a2a 0%, #1a1a1a 100%)" }}
        />
        <div
          className="absolute -left-[2px] top-[210px] w-[4px] h-[55px] rounded-l-full"
          style={{ background: "linear-gradient(90deg, #2a2a2a 0%, #1a1a1a 100%)" }}
        />
        <div
          className="absolute -right-[2px] top-[160px] w-[4px] h-[70px] rounded-r-full"
          style={{ background: "linear-gradient(270deg, #2a2a2a 0%, #1a1a1a 100%)" }}
        />

        <div
          className="relative rounded-[42px] overflow-hidden bg-white"
          style={{ width: 375, height: 800 }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-[52px] flex items-end justify-between px-6 pb-1 z-20 bg-white"
          >
            <span className="text-black text-[15px] font-semibold tracking-tight">{time}</span>
            <div className="flex items-center gap-[5px]">
              <svg className="w-[18px] h-[12px] text-black" fill="currentColor" viewBox="0 0 18 12">
                <path d="M1 4.5C2.93 2.18 5.79.5 9 .5s6.07 1.68 8 4l-1.5 1.13C14.03 3.76 11.66 2.5 9 2.5S3.97 3.76 2.5 5.63L1 4.5z"/>
                <path d="M3.5 7c1.3-1.37 3.28-2.25 5.5-2.25S12.2 5.63 13.5 7L12 8.13C11.1 7.13 9.63 6.5 9 6.5c-.63 0-2.1.63-3 1.63L3.5 7z"/>
                <path d="M6 9.5c.78-.78 1.85-1.25 3-1.25s2.22.47 3 1.25L9 12.5 6 9.5z"/>
              </svg>
              <svg className="w-[17px] h-[12px] text-black" fill="currentColor" viewBox="0 0 17 12">
                <rect x="0" y="3.5" width="3" height="8" rx="0.5"/>
                <rect x="4.5" y="2" width="3" height="9.5" rx="0.5"/>
                <rect x="9" y="0.5" width="3" height="11" rx="0.5"/>
                <rect x="13.5" y="0.5" width="3" height="11" rx="0.5" fillOpacity="0.3"/>
              </svg>
              <div className="flex items-center ml-[2px]">
                <div className="relative w-[25px] h-[12px] rounded-[3px] border-[1.5px] border-black/40">
                  <div className="absolute inset-[2px] right-[4px] bg-black rounded-[1px]" />
                </div>
                <div className="w-[1.5px] h-[5px] bg-black/40 rounded-r-full ml-[1px]" />
              </div>
            </div>
          </div>

          <div
            className="absolute top-[10px] left-1/2 -translate-x-1/2 z-30 flex items-center justify-center"
            style={{
              width: "120px",
              height: "34px",
              background: "#000",
              borderRadius: "17px"
            }}
          >
            <div
              className="w-[10px] h-[10px] rounded-full ml-8"
              style={{
                background: "radial-gradient(circle at 35% 35%, #1a1a1a 0%, #000 70%)",
                boxShadow: "inset 0 0 1px rgba(255,255,255,0.15)"
              }}
            />
          </div>

          <div className="absolute top-[52px] left-0 right-0 bottom-0 bg-white overflow-hidden">
            <div className="pt-4 px-5 pb-10 h-full overflow-y-auto">
              {children}
            </div>
          </div>

          <div
            className="absolute bottom-[8px] left-1/2 -translate-x-1/2 w-[134px] h-[5px] bg-black rounded-full z-20"
          />
        </div>
      </div>

      <div
        className="absolute inset-0 rounded-[46px] pointer-events-none overflow-hidden"
      >
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(165deg, rgba(255,255,255,0.06) 0%, transparent 40%)"
          }}
        />
      </div>
    </div>
  );
}
