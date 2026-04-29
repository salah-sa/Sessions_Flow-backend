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

        // Subscription Pricing Keys (Admin-editable, consumed by Plans page)
        public const string SubPriceProMonthly = "subscription_price_pro_monthly";
        public const string SubPriceProAnnual = "subscription_price_pro_annual";
        public const string SubPriceUltraMonthly = "subscription_price_ultra_monthly";
        public const string SubPriceUltraAnnual = "subscription_price_ultra_annual";
        public const string SubPriceEnterpriseMonthly = "subscription_price_enterprise_monthly";
        public const string SubPriceEnterpriseAnnual = "subscription_price_enterprise_annual";
        public const string SubFeaturesFreePlan = "subscription_features_free";
        public const string SubFeaturesProPlan = "subscription_features_pro";
        public const string SubFeaturesUltraPlan = "subscription_features_ultra";
        public const string SubFeaturesEnterprisePlan = "subscription_features_enterprise";
        public const string SubDescriptionFree = "subscription_desc_free";
        public const string SubDescriptionPro = "subscription_desc_pro";
        public const string SubDescriptionUltra = "subscription_desc_ultra";
        public const string SubDescriptionEnterprise = "subscription_desc_enterprise";
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
