import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Scale, FileText, Shield, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center space-x-3">
              <Scale className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-primary">FleetNest</span>
            </Link>
            
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al inicio
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-6">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
              Términos de Servicio
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Estos términos y condiciones rigen el uso de FleetNest y sus servicios.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Última actualización: 24 de julio de 2024
            </p>
          </div>

          {/* Terms Content */}
          <div className="space-y-8">
            {/* Acceptance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Scale className="h-5 w-5 text-primary" />
                  1. Aceptación de los Términos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Al acceder y utilizar FleetNest ("el Servicio"), usted acepta estar sujeto a estos Términos de Servicio ("Términos"). Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestro servicio.
                </p>
                <p>
                  Estos Términos constituyen un acuerdo legal vinculante entre usted y FleetNest. El uso continuado del Servicio constituye su aceptación de cualquier modificación a estos Términos.
                </p>
              </CardContent>
            </Card>

            {/* Service Description */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  2. Descripción del Servicio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  FleetNest es una plataforma de gestión de flotas que proporciona:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Seguimiento en tiempo real de vehículos</li>
                  <li>Gestión de conductores y empleados</li>
                  <li>Reportes y análisis de operaciones</li>
                  <li>Gestión de documentos y cumplimiento</li>
                  <li>Optimización de rutas y combustible</li>
                  <li>Herramientas de facturación y pagos</li>
                </ul>
                <p>
                  Nos reservamos el derecho de modificar, suspender o discontinuar cualquier aspecto del Servicio en cualquier momento.
                </p>
              </CardContent>
            </Card>

            {/* User Responsibilities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  3. Responsabilidades del Usuario
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <h4 className="font-semibold">Cuenta y Seguridad:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Mantener la confidencialidad de sus credenciales de acceso</li>
                  <li>Proporcionar información precisa y actualizada</li>
                  <li>Notificar inmediatamente cualquier uso no autorizado de su cuenta</li>
                  <li>Ser responsable de todas las actividades bajo su cuenta</li>
                </ul>
                
                <h4 className="font-semibold mt-6">Uso Apropiado:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Utilizar el Servicio solo para fines legales y comerciales legítimos</li>
                  <li>No interferir con el funcionamiento del Servicio</li>
                  <li>No intentar acceder a sistemas o datos sin autorización</li>
                  <li>Cumplir con todas las leyes y regulaciones aplicables</li>
                </ul>
              </CardContent>
            </Card>

            {/* Prohibited Uses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  4. Usos Prohibidos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Está prohibido utilizar el Servicio para:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Actividades ilegales o fraudulentas</li>
                  <li>Violar derechos de propiedad intelectual</li>
                  <li>Transmitir virus, malware o código malicioso</li>
                  <li>Realizar ingeniería inversa del software</li>
                  <li>Revender o redistribuir el Servicio sin autorización</li>
                  <li>Interferir con la seguridad del Servicio</li>
                  <li>Crear cuentas mediante medios automatizados</li>
                </ul>
              </CardContent>
            </Card>

            {/* Data and Privacy */}
            <Card>
              <CardHeader>
                <CardTitle>5. Datos y Privacidad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Su privacidad es importante para nosotros. El manejo de sus datos personales se rige por nuestra Política de Privacidad, que forma parte integral de estos Términos.
                </p>
                <p>
                  Usted retiene la propiedad de sus datos comerciales, pero nos otorga una licencia para procesarlos conforme sea necesario para proporcionar el Servicio.
                </p>
              </CardContent>
            </Card>

            {/* Payment Terms */}
            <Card>
              <CardHeader>
                <CardTitle>6. Términos de Pago</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <h4 className="font-semibold">Suscripciones:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Los pagos se procesan automáticamente según el plan seleccionado</li>
                  <li>Los precios pueden cambiar con notificación previa de 30 días</li>
                  <li>No se otorgan reembolsos por períodos parciales</li>
                  <li>La suspensión del servicio ocurre por falta de pago</li>
                </ul>
                
                <h4 className="font-semibold mt-4">Cancelaciones:</h4>
                <p>
                  Puede cancelar su suscripción en cualquier momento. El servicio continuará hasta el final del período facturado actual.
                </p>
              </CardContent>
            </Card>

            {/* Intellectual Property */}
            <Card>
              <CardHeader>
                <CardTitle>7. Propiedad Intelectual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  FleetNest y todo su contenido, características y funcionalidad son propiedad de FleetNest y están protegidos por derechos de autor, marcas comerciales y otras leyes de propiedad intelectual.
                </p>
                <p>
                  Se le otorga una licencia limitada, no exclusiva y revocable para utilizar el Servicio de acuerdo con estos Términos.
                </p>
              </CardContent>
            </Card>

            {/* Limitation of Liability */}
            <Card>
              <CardHeader>
                <CardTitle>8. Limitación de Responsabilidad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY, FLEETNEST NO SERÁ RESPONSABLE POR DAÑOS INDIRECTOS, INCIDENTALES, ESPECIALES, CONSECUENCIALES O PUNITIVOS.
                </p>
                <p>
                  Nuestra responsabilidad total no excederá el monto pagado por usted en los 12 meses anteriores al evento que dio origen a la reclamación.
                </p>
              </CardContent>
            </Card>

            {/* Service Availability */}
            <Card>
              <CardHeader>
                <CardTitle>9. Disponibilidad del Servicio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Nos esforzamos por mantener el Servicio disponible 24/7, pero no garantizamos un tiempo de actividad del 100%. El mantenimiento programado puede requerir interrupciones temporales.
                </p>
                <p>
                  No somos responsables por interrupciones causadas por factores fuera de nuestro control, incluyendo fallas de internet, desastres naturales o problemas de terceros.
                </p>
              </CardContent>
            </Card>

            {/* Termination */}
            <Card>
              <CardHeader>
                <CardTitle>10. Terminación</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Podemos suspender o terminar su acceso al Servicio inmediatamente, sin aviso previo, por cualquier violación de estos Términos.
                </p>
                <p>
                  Usted puede terminar su cuenta en cualquier momento contactándonos o utilizando las opciones disponibles en su panel de control.
                </p>
                <p>
                  Al terminar, cesará su derecho a utilizar el Servicio, pero las disposiciones que por su naturaleza deban sobrevivir continuarán en vigor.
                </p>
              </CardContent>
            </Card>

            {/* Changes to Terms */}
            <Card>
              <CardHeader>
                <CardTitle>11. Modificaciones a los Términos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Nos reservamos el derecho de modificar estos Términos en cualquier momento. Los cambios significativos serán notificados con al menos 30 días de anticipación.
                </p>
                <p>
                  Su uso continuado del Servicio después de la notificación constituye su aceptación de los nuevos Términos.
                </p>
              </CardContent>
            </Card>

            {/* Governing Law */}
            <Card>
              <CardHeader>
                <CardTitle>12. Ley Aplicable</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Estos Términos se rigen por las leyes del país donde FleetNest tiene su sede principal, sin consideración a conflictos de principios legales.
                </p>
                <p>
                  Cualquier disputa será resuelta mediante arbitraje vinculante de acuerdo con las reglas de arbitraje comercial aplicables.
                </p>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>13. Información de Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Si tiene preguntas sobre estos Términos de Servicio, puede contactarnos en:
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p><strong>Email:</strong> legal@fleetnest.app</p>
                  <p><strong>Dirección:</strong> FleetNest Legal Department</p>
                  <p><strong>Teléfono:</strong> +1 (555) 123-4567</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Back to Login */}
          <div className="text-center mt-12 pt-8 border-t">
            <Link to="/auth">
              <Button size="lg">
                Volver al Login
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-muted/50 py-8 mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-muted-foreground">
            © 2024 FleetNest. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}