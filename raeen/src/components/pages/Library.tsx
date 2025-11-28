import React from 'react';
import GameGrid from '../GameGrid';

const Library: React.FC = () => {
    return (
        <div className="flex flex-col h-full overflow-hidden">
            <GameGrid />
        </div>
    );
};

export default Library;