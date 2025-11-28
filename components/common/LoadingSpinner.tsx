
const LoadingSpinner = () => {
    return (
        <div className="flex items-center justify-center h-full min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-accent"></div>
        </div>
    );
};

export default LoadingSpinner;
