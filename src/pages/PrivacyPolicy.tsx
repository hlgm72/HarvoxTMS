import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Lock, Database, Users, FileText, Globe, Mail } from "lucide-react";
import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/80 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/landing">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <Shield className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">Política de Privacidad</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>Introducción</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                En FleetNest, nos comprometemos a proteger y respetar su privacidad. Esta Política de Privacidad 
                explica cómo recopilamos, usamos, divulgamos y protegemos su información cuando utiliza nuestros 
                servicios de gestión de transporte.
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Última actualización:</strong> {new Date().toLocaleDateString('es-ES')}
              </p>
            </CardContent>
          </Card>

          {/* Information We Collect */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-primary" />
                <CardTitle>1. Información que Recopilamos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-2">Información de Cuenta</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Dirección de correo electrónico</li>
                    <li>Nombre y apellidos</li>
                    <li>Información de perfil de usuario</li>
                    <li>Preferencias de idioma y zona horaria</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Datos de la Empresa</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Nombre y datos de la empresa</li>
                    <li>Roles y permisos de usuario</li>
                    <li>Configuración organizacional</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Datos Operacionales</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Información de vehículos y flota</li>
                    <li>Datos de conductores y asignaciones</li>
                    <li>Información de cargas y envíos</li>
                    <li>Documentos y archivos subidos</li>
                    <li>Datos de ubicación GPS para seguimiento</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Datos Técnicos</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Registros de actividad del sistema</li>
                    <li>Información del navegador y dispositivo</li>
                    <li>Cookies y tecnologías similares</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How We Use Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>2. Cómo Usamos la Información</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                <li>Proporcionar servicios de gestión de transporte y logística</li>
                <li>Facilitar el seguimiento en tiempo real de vehículos y cargas</li>
                <li>Generar reportes y análisis de rendimiento</li>
                <li>Mejorar la seguridad y eficiencia operacional</li>
                <li>Enviar comunicaciones relacionadas con el servicio</li>
                <li>Cumplir con requisitos legales y regulatorios</li>
                <li>Mejorar y desarrollar nuevas funcionalidades</li>
              </ul>
            </CardContent>
          </Card>

          {/* Information Sharing */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle>3. Compartir Información</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-800">
                  🛡️ No vendemos sus datos personales a terceros bajo ninguna circunstancia.
                </p>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Compartimos información únicamente en los siguientes casos:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li><strong>Proveedores de servicios:</strong> Con Supabase, Google Maps y otros proveedores tecnológicos necesarios para el funcionamiento del servicio</li>
                  <li><strong>Dentro de su organización:</strong> Según los permisos y roles configurados por su empresa</li>
                  <li><strong>Cumplimiento legal:</strong> Cuando sea requerido por autoridades competentes o por ley</li>
                  <li><strong>Protección de derechos:</strong> Para proteger nuestros derechos legales o los de nuestros usuarios</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>4. Seguridad de Datos</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                <li><strong>Encriptación:</strong> Todos los datos se encriptan en tránsito y en reposo</li>
                <li><strong>Autenticación:</strong> Sistemas de autenticación seguros con opción multi-factor</li>
                <li><strong>Control de acceso:</strong> Permisos basados en roles para proteger información sensible</li>
                <li><strong>Monitoreo:</strong> Supervisión continua de la seguridad del sistema</li>
                <li><strong>Auditorías:</strong> Revisiones regulares de seguridad y cumplimiento</li>
              </ul>
            </CardContent>
          </Card>

          {/* Your Rights */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>5. Sus Derechos</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Usted tiene los siguientes derechos respecto a sus datos personales:</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li><strong>Acceso:</strong> Solicitar acceso a sus datos personales</li>
                  <li><strong>Rectificación:</strong> Corregir información incorrecta o incompleta</li>
                  <li><strong>Eliminación:</strong> Solicitar la eliminación de sus datos (sujeto a obligaciones de retención legal)</li>
                  <li><strong>Portabilidad:</strong> Recibir sus datos en un formato estructurado y legible</li>
                  <li><strong>Oposición:</strong> Oponerse al procesamiento de sus datos en ciertas circunstancias</li>
                  <li><strong>Limitación:</strong> Solicitar la limitación del procesamiento de sus datos</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Data Retention */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-primary" />
                <CardTitle>6. Retención de Datos</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                <li><strong>Datos de cuenta:</strong> Mientras su cuenta permanezca activa</li>
                <li><strong>Datos operacionales:</strong> 7 años para cumplimiento con regulaciones de transporte</li>
                <li><strong>Registros del sistema:</strong> 90 días para propósitos de diagnóstico y seguridad</li>
                <li><strong>Documentos legales:</strong> Según requieran las leyes aplicables</li>
              </ul>
            </CardContent>
          </Card>

          {/* Cookies */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle>7. Cookies y Tecnologías Similares</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Utilizamos cookies y tecnologías similares para mejorar su experiencia:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li><strong>Cookies esenciales:</strong> Necesarias para el funcionamiento básico del sitio</li>
                  <li><strong>Cookies de rendimiento:</strong> Para analizar el uso y mejorar el servicio</li>
                  <li><strong>Cookies de preferencias:</strong> Para recordar sus configuraciones</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* International Transfers */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle>8. Transferencias Internacionales</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Sus datos pueden ser procesados en servidores ubicados fuera de su país de residencia, 
                incluyendo Estados Unidos y otros países donde operan nuestros proveedores de servicios. 
                Implementamos medidas de protección adecuadas para asegurar que sus datos mantengan 
                el mismo nivel de protección.
              </p>
            </CardContent>
          </Card>

          {/* Changes to Policy */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>9. Cambios a esta Política</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Nos reservamos el derecho de actualizar esta Política de Privacidad ocasionalmente. 
                Los cambios significativos serán notificados a través de nuestro servicio o por 
                correo electrónico. La fecha de la última actualización aparece al inicio de este documento.
              </p>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-primary" />
                <CardTitle>10. Contacto</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Si tiene preguntas sobre esta Política de Privacidad o desea ejercer sus derechos, 
                contáctenos:
              </p>
              
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">privacy@fleetnest.com</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p><strong>FleetNest</strong></p>
                  <p>Departamento de Privacidad</p>
                  <p>Respuesta garantizada en 30 días</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  Esta Política de Privacidad está diseñada para cumplir con las regulaciones aplicables 
                  de protección de datos, incluyendo GDPR, CCPA y normativas locales.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}