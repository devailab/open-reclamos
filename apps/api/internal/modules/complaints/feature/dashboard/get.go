package dashboard

import (
	"context"
	"slices"

	"openreclamos.com/api/internal/shared/auth"
	"openreclamos.com/api/internal/shared/database/repository"
	"openreclamos.com/api/internal/shared/operation"
	"openreclamos.com/api/internal/shared/utils"
)

var (
	trendRanges      = []int{7, 15, 30}
	defaultTrendDays = 15
)

// Get devuelve métricas y tendencia diaria de las tiendas visibles.
func (f *Feature) Get(ctx context.Context, p auth.Principal, in operation.Input) (operation.Output, error) {
	metrics, err := f.deps.Repo.GetDashboard(
		ctx,
		repository.GetDashboardParams{OrganizationID: p.OrganizationID, AllStores: p.AllStores, StoreIds: p.StoreIDs},
	)
	if err != nil {
		return operation.Output{}, err
	}

	days := utils.Number(in.Data, "trend_days")
	if !slices.Contains(trendRanges, days) {
		days = defaultTrendDays
	}

	trend, err := f.deps.Repo.DailyTrend(
		ctx,
		repository.DailyTrendParams{
			OrganizationID: p.OrganizationID,
			AllStores:      p.AllStores,
			StoreIds:       p.StoreIDs,
			Days:           days,
			Location:       utils.LimaZone,
		},
	)

	return operation.Record(map[string]any{"metrics": metrics, "trend": trend}), err
}
