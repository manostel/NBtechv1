import { Skeleton } from '@mui/material';

const Navigation = () => {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadNavigation = async () => {
            setIsLoading(true);
            try {
                // Your existing navigation data loading logic
                // ...
                setIsLoading(false);
            } catch (error) {
                console.error('Error loading navigation:', error);
                setIsLoading(false);
            }
        };

        loadNavigation();
    }, []);

    return (
        <Box sx={{ /* existing styles */ }}>
            {isLoading ? (
                // Navigation skeleton
                <Box sx={{ p: 2 }}>
                    <Skeleton variant="rectangular" height={40} sx={{ mb: 2 }} />
                    <Skeleton variant="rectangular" height={40} sx={{ mb: 2 }} />
                    <Skeleton variant="rectangular" height={40} sx={{ mb: 2 }} />
                </Box>
            ) : (
                // Your existing navigation content
                // ...
            )}
        </Box>
    );
}; 