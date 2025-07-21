import React, { memo } from 'react';

const MasterLayout = ({ children, ...props }) => {
    return (
        <div {...props}>
            <div>
                {children}
            </div>
        </div>
    )
}


export default memo(MasterLayout);