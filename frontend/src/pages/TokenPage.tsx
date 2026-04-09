import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useGetWowToken } from '@/api/queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function TokenPage() {
  const { data, isLoading } = useGetWowToken();

  const chartData = useMemo(() => {
    if (!data?.history) {
      return [];
    }

    return data.history.map((point) => ({
      timestamp: point.createdAt,
      price: point.price,
      fullDate: point.createdAt,
    }));
  }, [data?.history]);

  const currentPrice =
    typeof data?.currentPrice === 'number'
      ? `${new Intl.NumberFormat('fr-FR').format(data.currentPrice)} po`
      : 'Aucune donnee';

  return (
    <div className="min-h-full bg-background">
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-amber-300 bg-clip-text text-transparent md:text-4xl">
            WoW Token Tracker
          </h1>
          <p className="text-muted-foreground">
            Evolution des prix du token sur les 7 derniers jours (La valeur du token se met à jour toutes les 3 heures.).
          </p>
        </div>

        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-card to-card">
          <CardHeader>
            <CardTitle className="text-amber-400">Prix actuel</CardTitle>
            <CardDescription>Dernier prix enregistre dans la base</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black tracking-tight text-amber-300 md:text-4xl">{currentPrice}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historique sur 7 jours</CardTitle>
            <CardDescription>Cours du WoW Token en or</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[360px] w-full" />
            ) : chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun historique disponible pour le moment.
              </p>
            ) : (
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 16, right: 12, left: 4, bottom: 8 }}
                  >
                    <defs>
                      <linearGradient id="tokenArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.35} />
                    <XAxis
                      dataKey="timestamp"
                      minTickGap={28}
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      tickFormatter={(value) =>
                        new Date(value).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                        })
                      }
                    />
                    <YAxis
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      tickFormatter={(value) => `${new Intl.NumberFormat('fr-FR').format(Number(value))} po`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111827',
                        border: '1px solid #f59e0b66',
                        borderRadius: '0.5rem',
                      }}
                      formatter={(value) => {
                        const numericValue = Number(value ?? 0);
                        return [`${new Intl.NumberFormat('fr-FR').format(numericValue)} po`, 'Prix'];
                      }}
                      labelFormatter={(_, payload) => {
                        const raw = payload?.[0]?.payload?.fullDate;
                        if (!raw) {
                          return '';
                        }
                        return new Date(raw).toLocaleString('fr-FR');
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      fill="url(#tokenArea)"
                      dot={{ r: 2, strokeWidth: 1, fill: '#f59e0b' }}
                      activeDot={{ r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
