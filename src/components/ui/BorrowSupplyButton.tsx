import { useState } from 'react';
import { Button } from './Button'; // Adjust import path as needed

const SupplyBorrowToggle = () => {
    const [activeButton, setActiveButton] = useState('borrow');

    return (
        <div className="flex space-x-2 bg-black p-2">
            <Button
                className={activeButton === 'supply'
                    ? 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background py-2 px-4 w-full bg-[#4F3917] hover:bg-[#5e4520] text-[#F59E0B] border-[#61410B] border-[1px] rounded-lg leading-zero whitespace-nowrap text-sm h-[30px]'
                    : 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background py-2 px-4 w-full bg-[#27272ABF] hover:bg-[#323232] text-[#52525B] border-[#27272A] border-[1px] rounded-lg leading-zero whitespace-nowrap text-sm h-[30px]'}
                onClick={() => setActiveButton('supply')}
            >
                supply
            </Button>
            <Button
                className={activeButton === 'borrow'
                    ? 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background py-2 px-4 w-full bg-[#4F3917] hover:bg-[#5e4520] text-[#F59E0B] border-[#61410B] border-[1px] rounded-lg leading-zero whitespace-nowrap text-sm h-[30px]'
                    : 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background py-2 px-4 w-full bg-[#27272ABF] hover:bg-[#323232] text-[#52525B] border-[#27272A] border-[1px] rounded-lg leading-zero whitespace-nowrap text-sm h-[30px]'}
                onClick={() => setActiveButton('borrow')}
            >
                borrow
            </Button>
        </div>
    );
};

export default SupplyBorrowToggle;