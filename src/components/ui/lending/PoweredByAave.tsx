import React from "react";

const PoweredByAave = () => {
  return (
    <div className="flex justify-end mt-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-white">powered by</span>
        <img src={`/protocols/aave.svg`} alt="Aave Logo" className="h-3" />
      </div>
    </div>
  );
};

export default PoweredByAave;
