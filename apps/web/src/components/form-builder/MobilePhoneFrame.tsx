"use client";

interface MobilePhoneFrameProps {
  children: React.ReactNode;
}

export function MobilePhoneFrame({ children }: MobilePhoneFrameProps) {
  return (
    <div className="relative bg-gray-800 rounded-[40px] p-3 shadow-2xl">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-10" />
      <div className="bg-white rounded-[32px] overflow-hidden" style={{ width: 375, minHeight: 600 }}>
        <div className="pt-12 px-4 pb-6 overflow-y-auto" style={{ maxHeight: 600 }}>
          {children}
        </div>
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-600 rounded-full" />
    </div>
  );
}
