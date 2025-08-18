import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { useFleetNotifications } from '@/components/notifications';
import { useUserCompanies } from '@/hooks/useUserCompanies';
import { LoadsManager } from '@/components/driver/LoadsManager';
import { FinancialSummary } from '@/components/driver/FinancialSummary';
import { MapPin, Clock, DollarSign, Fuel, Phone, MessageSquare, FileText, AlertTriangle } from "lucide-react";

export default function DriverDashboard() {
  const { t } = useTranslation(['common', 'fleet', 'dashboard']);
  const { showSuccess } = useFleetNotifications();
  const { companies } = useUserCompanies();
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    // Check if user just completed invitation acceptance
    const fromInvitation = searchParams.get('from_invitation');
    if (fromInvitation === 'true' && companies && companies.length > 0) {
      // Show welcome message after a short delay to ensure Dashboard is loaded
      setTimeout(() => {
        const companyName = companies[0]?.name || 'la empresa';
        showSuccess(
          "¡Invitación Aceptada!",
          `Bienvenido a ${companyName}. Has sido registrado como Conductor de la compañía.`
        );
      }, 1000);
    }
  }, [searchParams, companies, showSuccess]);
  
  return (
    <>
      <PageToolbar 
        title={t('dashboard:driver.title')}
      />
      <div className="p-2 md:p-4 space-y-6">

      {/* Main Driver Focus Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Load Management - Primary Focus */}
        <LoadsManager className="lg:col-span-1" dashboardMode={true} />
        
        {/* Financial Summary - Daily Focus */}
        <FinancialSummary className="lg:col-span-1" />
      </div>

      {/* Quick Actions & Vehicle Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              {t('dashboard:driver.documents.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">{t('dashboard:driver.documents.cdl_license')}</span>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  {t('dashboard:driver.documents.valid')}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">{t('dashboard:driver.documents.medical_certificate')}</span>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  {t('dashboard:driver.documents.valid')}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">{t('dashboard:driver.documents.hazmat_permit')}</span>
                <Badge variant="outline" className="bg-orange-50 text-orange-700">
                  {t('dashboard:driver.documents.expires_soon')}
                </Badge>
              </div>
              <Button className="w-full mt-4" variant="outline" size="sm">
                {t('dashboard:driver.documents.manage')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5 text-orange-600" />
              {t('dashboard:driver.vehicle.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('dashboard:driver.vehicle.fuel')}</span>
                <span className="font-medium">75%</span>
              </div>
              <Progress value={75} className="h-2" />
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('dashboard:driver.vehicle.odometer')}</span>
                <span className="font-medium">145,678 mi</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('dashboard:driver.vehicle.next_service')}</span>
                <span className="font-medium">2,300 mi</span>
              </div>
              
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800">{t('dashboard:driver.vehicle.all_good')}</p>
                <p className="text-xs text-green-600">{t('dashboard:driver.vehicle.no_alerts')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              {t('dashboard:driver.hours.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('dashboard:driver.hours.driving_today')}</span>
                <span className="font-medium">6.5 / 11 {t('dashboard:driver.hours.hrs')}</span>
              </div>
              <Progress value={59} className="h-2" />
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('dashboard:driver.hours.on_duty')}</span>
                <span className="font-medium">8.2 / 14 {t('dashboard:driver.hours.hrs')}</span>
              </div>
              <Progress value={58} className="h-2" />
              
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-800">{t('dashboard:driver.hours.rest_required')}</p>
                <p className="text-xs text-blue-600">4 {t('dashboard:driver.hours.hrs')} 30 min</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard:driver.activity.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">{t('dashboard:driver.activity.load_delivered')}</p>
                  <p className="text-xs text-muted-foreground">Hace 2 horas - Miami, FL</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">{t('dashboard:driver.activity.new_load_assigned')}</p>
                  <p className="text-xs text-muted-foreground">Hace 3 horas - Houston, TX → Dallas, TX</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                <div className="w-2 h-2 bg-orange-600 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">{t('dashboard:driver.activity.dispatcher_message')}</p>
                  <p className="text-xs text-muted-foreground">Hace 4 horas - {t('dashboard:driver.activity.route_change')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              {t('dashboard:driver.notifications.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm font-medium text-orange-800">{t('dashboard:driver.notifications.hazmat_expires')}</p>
                <p className="text-xs text-orange-600">{t('dashboard:driver.notifications.renew_before')}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-800">{t('dashboard:driver.notifications.safety_training')}</p>
                <p className="text-xs text-blue-600">{t('dashboard:driver.notifications.complete_before')}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800">{t('dashboard:driver.notifications.safety_bonus')}</p>
                <p className="text-xs text-green-600">{t('dashboard:driver.notifications.bonus_added')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </>
  );
}