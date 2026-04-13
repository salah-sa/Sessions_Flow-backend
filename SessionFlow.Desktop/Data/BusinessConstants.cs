namespace SessionFlow.Desktop.Data;

public static class BusinessConstants
{
    public const string Currency = "EGP";

    public static class Settings
    {
        // Pricing Keys
        public const string PriceLevel1 = "price_level_1";
        public const string PriceLevel2 = "price_level_2";
        public const string PriceLevel3 = "price_level_3";
        public const string PriceLevel4 = "price_level_4";

        // Curriculum Keys
        public const string LengthLevel1 = "length_level_1";
        public const string LengthLevel2 = "length_level_2";
        public const string LengthLevel3 = "length_level_3";
        public const string LengthLevel4 = "length_level_4";
    }

    public static class Defaults
    {
        public static readonly Dictionary<int, int> CurriculumLengths = new()
        {
            { 1, 8 },
            { 2, 12 },
            { 3, 16 },
            { 4, 16 } // Fallback
        };

        public static readonly Dictionary<int, decimal> Pricing = new()
        {
            { 1, 100m },
            { 2, 100m },
            { 3, 100m },
            { 4, 150m }
        };
    }
}
