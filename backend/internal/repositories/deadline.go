package repositories

import (
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// DeadlineEnforcementMiddleware auto-closes jobs whose deadline has passed
func DeadlineEnforcementMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Auto-close expired jobs — runs before every request
		db.Model(&Job{}).
			Where("status = ? AND deadline < ?", "open", time.Now()).
			Update("status", "closed")

		c.Next()
	}
}