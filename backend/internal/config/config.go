package config

import (
	"log"
	"os"

	"github.com/spf13/viper"
)

type Config struct {
	Port        string
	DBHost      string `mapstructure:"db_host"`
	DBPort      string `mapstructure:"db_port"`
	DBUser      string `mapstructure:"db_user"`
	DBPass      string `mapstructure:"db_password"`
	DBName      string `mapstructure:"db_name"`
	DBSSL       string `mapstructure:"db_sslmode"`
	UploadPath  string `mapstructure:"upload_path"`
	JWTSecret   string `mapstructure:"jwt_secret"`
	JWTExpiry   string `mapstructure:"jwt_expiry"`
	AdminUser   string `mapstructure:"admin_username"`
	AdminPass   string `mapstructure:"admin_password"`
}

var AppConfig *Config

func LoadConfig() {
	// Load .env file if it exists
	viper.SetConfigName(".env")
	viper.SetConfigType("env")
	viper.AddConfigPath(".")
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			log.Println(".env file not found, using environment variables and defaults")
		} else {
			log.Printf("Error reading .env: %v\n", err)
		}
	} else {
		log.Println("Successfully loaded .env file")
	}

	// Also read from actual environment variables (overrides .env)
	viper.AutomaticEnv()

	// Set defaults
	viper.SetDefault("PORT", "8080")
	viper.SetDefault("DB_HOST", "localhost")
	viper.SetDefault("DB_PORT", "5432")
	viper.SetDefault("DB_USER", "postgres")
	viper.SetDefault("DB_PASSWORD", "password")
	viper.SetDefault("DB_NAME", "jap_db")
	viper.SetDefault("DB_SSLMODE", "disable")
	viper.SetDefault("UPLOAD_PATH", "./uploads")
	viper.SetDefault("JWT_SECRET", "your-secret-key-change-this")
	viper.SetDefault("JWT_EXPIRY", "24h")
	viper.SetDefault("ADMIN_USERNAME", "admin")
	viper.SetDefault("ADMIN_PASSWORD", "admin123")

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		log.Fatal("Failed to load config:", err)
	}

	AppConfig = &config
	log.Printf("Config loaded: DBHost=%s DBPort=%s DBUser=%s DBName=%s\n",
		config.DBHost, config.DBPort, config.DBUser, config.DBName)

	// Ensure upload directory exists
	if err := os.MkdirAll(config.UploadPath, 0755); err != nil {
		log.Fatal("Failed to create upload directory:", err)
	}
}

func GetEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func GetEnvAsInt(key string, defaultValue int) int {
	if value, exists := os.LookupEnv(key); exists {
		// Simple parsing - in production use strconv.Atoi
		// For now just return default since we don't use this
		_ = value
	}
	return defaultValue
}
