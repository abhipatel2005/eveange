// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { Button } from '@/components/ui/Button';
// import { AlertCircle, Upload, Trash2, Settings } from 'lucide-react';
// import { apiClient } from '@/api/client';

// interface CertificateTemplate {
//   id: string;
//   name: string;
//   type: 'canvas' | 'powerpoint';
//   file_path?: string;
//   template_data: any;
//   placeholder_mapping: Record<string, string>;
//   extracted_placeholders?: string[];
//   created_at: string;
//   updated_at: string;
// }

// interface DataField {
//   key: string;
//   label: string;
//   description: string;
//   category: 'participant' | 'event' | 'registration' | 'system';
//   dataType: 'text' | 'date' | 'number' | 'email' | 'phone';
//   example?: string;
// }

// interface Participant {
//   id: string;
//   name: string;
//   email: string;
//   phone?: string;
//   organization?: string;
//   registration_date: string;
//   attendance_date?: string;
//   registration_id: string;
//   custom_fields: Record<string, any>;
// }

// const CertificateGenerationPage: React.FC = () => {
//   const { eventId } = useParams<{ eventId: string }>();
//   const navigate = useNavigate();
//   const { toast } = useToast();

//   const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
//   const [dataFields, setDataFields] = useState<DataField[]>([]);
//   const [participants, setParticipants] = useState<Participant[]>([]);
//   const [selectedTemplate, setSelectedTemplate] = useState<string>('');
//   const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
//   const [isGenerating, setIsGenerating] = useState(false);
//   const [isLoading, setIsLoading] = useState(true);
//   const [showPlaceholderMapping, setShowPlaceholderMapping] = useState(false);
//   const [mappingTemplate, setMappingTemplate] = useState<CertificateTemplate | null>(null);

//   // File upload state
//   const [uploadFile, setUploadFile] = useState<File | null>(null);
//   const [uploadName, setUploadName] = useState('');
//   const [uploadType, setUploadType] = useState<'canvas' | 'powerpoint'>('powerpoint');
//   const [isUploading, setIsUploading] = useState(false);

//   useEffect(() => {
//     loadData();
//   }, [eventId]);

//   const loadData = async () => {
//     try {
//       setIsLoading(true);
//       const [templatesRes, dataFieldsRes, participantsRes] = await Promise.all([
//         api.get('/certificates/templates'),
//         api.get('/certificates/data-fields'),
//         api.get(`/certificates/events/${eventId}/participants`)
//       ]);

//       setTemplates(templatesRes.data.data || []);
//       setDataFields(dataFieldsRes.data.data || []);
//       setParticipants(participantsRes.data.data || []);
//     } catch (error) {
//       console.error('Error loading data:', error);
//       toast({
//         title: 'Error',
//         description: 'Failed to load certificate data',
//         variant: 'destructive'
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleFileUpload = async () => {
//     if (!uploadFile || !uploadName) {
//       toast({
//         title: 'Error',
//         description: 'Please select a file and provide a template name',
//         variant: 'destructive'
//       });
//       return;
//     }

//     try {
//       setIsUploading(true);
//       const formData = new FormData();
//       formData.append('template', uploadFile);
//       formData.append('name', uploadName);
//       formData.append('type', uploadType);

//       const response = await api.post('/certificates/templates', formData, {
//         headers: { 'Content-Type': 'multipart/form-data' }
//       });

//       toast({
//         title: 'Success',
//         description: response.data.data.message || 'Template uploaded successfully'
//       });

//       // Reset form
//       setUploadFile(null);
//       setUploadName('');
//       setUploadType('powerpoint');

//       // Reload templates
//       await loadData();

//       // If placeholders were extracted, show mapping interface
//       if (response.data.data.placeholders && response.data.data.placeholders.length > 0) {
//         setMappingTemplate(response.data.data.template);
//         setShowPlaceholderMapping(true);
//       }

//     } catch (error: any) {
//       console.error('Error uploading template:', error);
//       toast({
//         title: 'Error',
//         description: error.response?.data?.message || 'Failed to upload template',
//         variant: 'destructive'
//       });
//     } finally {
//       setIsUploading(false);
//     }
//   };

//   const handlePlaceholderMapping = async (mapping: Record<string, string>) => {
//     if (!mappingTemplate) return;

//     try {
//       await api.put(`/certificates/templates/${mappingTemplate.id}/mapping`, {
//         placeholderMapping: mapping
//       });

//       toast({
//         title: 'Success',
//         description: 'Placeholder mapping updated successfully'
//       });

//       setShowPlaceholderMapping(false);
//       setMappingTemplate(null);
//       await loadData();

//     } catch (error: any) {
//       console.error('Error updating mapping:', error);
//       toast({
//         title: 'Error',
//         description: error.response?.data?.message || 'Failed to update mapping',
//         variant: 'destructive'
//       });
//     }
//   };

//   const handleGenerateCertificates = async () => {
//     if (!selectedTemplate) {
//       toast({
//         title: 'Error',
//         description: 'Please select a template',
//         variant: 'destructive'
//       });
//       return;
//     }

//     try {
//       setIsGenerating(true);
//       const response = await api.post(`/certificates/events/${eventId}/generate`, {
//         templateId: selectedTemplate,
//         participantIds: selectedParticipants.length > 0 ? selectedParticipants : undefined
//       });

//       const { results, summary } = response.data.data;

//       toast({
//         title: 'Success',
//         description: `Generated ${summary.successful} certificates successfully${summary.failed > 0 ? `, ${summary.failed} failed` : ''}`
//       });

//       // Reset selections
//       setSelectedParticipants([]);

//     } catch (error: any) {
//       console.error('Error generating certificates:', error);
//       toast({
//         title: 'Error',
//         description: error.response?.data?.message || 'Failed to generate certificates',
//         variant: 'destructive'
//       });
//     } finally {
//       setIsGenerating(false);
//     }
//   };

//   const handleDeleteTemplate = async (templateId: string) => {
//     if (!confirm('Are you sure you want to delete this template?')) return;

//     try {
//       await api.delete(`/certificates/templates/${templateId}`);
//       toast({
//         title: 'Success',
//         description: 'Template deleted successfully'
//       });
//       await loadData();
//     } catch (error: any) {
//       console.error('Error deleting template:', error);
//       toast({
//         title: 'Error',
//         description: error.response?.data?.message || 'Failed to delete template',
//         variant: 'destructive'
//       });
//     }
//   };

//   const toggleParticipantSelection = (participantId: string) => {
//     setSelectedParticipants(prev =>
//       prev.includes(participantId)
//         ? prev.filter(id => id !== participantId)
//         : [...prev, participantId]
//     );
//   };

//   if (isLoading) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
//           <p className="mt-4 text-gray-600">Loading certificate data...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <div className="flex items-center justify-between">
//         <h1 className="text-3xl font-bold">Certificate Generation</h1>
//         <Button onClick={() => navigate(-1)} variant="outline">
//           Back to Event
//         </Button>
//       </div>

//       {/* Template Upload Section */}
//       <Card>
//         <CardHeader>
//           <CardTitle className="flex items-center gap-2">
//             <Upload className="h-5 w-5" />
//             Upload New Template
//           </CardTitle>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             <div>
//               <Label htmlFor="template-name">Template Name</Label>
//               <Input
//                 id="template-name"
//                 value={uploadName}
//                 onChange={(e) => setUploadName(e.target.value)}
//                 placeholder="Enter template name"
//               />
//             </div>
//             <div>
//               <Label htmlFor="template-type">Template Type</Label>
//               <Select value={uploadType} onValueChange={(value: any) => setUploadType(value)}>
//                 <SelectTrigger>
//                   <SelectValue />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="powerpoint">PowerPoint (.pptx)</SelectItem>
//                   <SelectItem value="canvas">Canvas (Programmatic)</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//             <div>
//               <Label htmlFor="template-file">Template File</Label>
//               <Input
//                 id="template-file"
//                 type="file"
//                 accept=".pptx,.png,.jpg,.jpeg"
//                 onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
//               />
//             </div>
//           </div>
//           <Button
//             onClick={handleFileUpload}
//             disabled={isUploading || !uploadFile || !uploadName}
//             className="w-full md:w-auto"
//           >
//             {isUploading ? 'Uploading...' : 'Upload Template'}
//           </Button>
//         </CardContent>
//       </Card>

//       {/* Templates List */}
//       <Card>
//         <CardHeader>
//           <CardTitle>Available Templates</CardTitle>
//         </CardHeader>
//         <CardContent>
//           {templates.length === 0 ? (
//             <Alert>
//               <AlertCircle className="h-4 w-4" />
//               <AlertDescription>
//                 No templates available. Upload a template to get started.
//               </AlertDescription>
//             </Alert>
//           ) : (
//             <div className="space-y-4">
//               <div>
//                 <Label htmlFor="template-select">Select Template for Generation</Label>
//                 <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
//                   <SelectTrigger>
//                     <SelectValue placeholder="Choose a template" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {templates.map((template) => (
//                       <SelectItem key={template.id} value={template.id}>
//                         {template.name} ({template.type})
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </div>

//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead>Name</TableHead>
//                     <TableHead>Type</TableHead>
//                     <TableHead>Placeholders</TableHead>
//                     <TableHead>Status</TableHead>
//                     <TableHead>Actions</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {templates.map((template) => {
//                     const placeholderCount = template.extracted_placeholders?.length || 0;
//                     const mappedCount = Object.values(template.placeholder_mapping || {}).filter(Boolean).length;
//                     const isConfigured = placeholderCount === 0 || placeholderCount === mappedCount;

//                     return (
//                       <TableRow key={template.id}>
//                         <TableCell className="font-medium">{template.name}</TableCell>
//                         <TableCell>
//                           <Badge variant={template.type === 'powerpoint' ? 'default' : 'secondary'}>
//                             {template.type}
//                           </Badge>
//                         </TableCell>
//                         <TableCell>
//                           {placeholderCount > 0 ? `${mappedCount}/${placeholderCount} mapped` : 'None'}
//                         </TableCell>
//                         <TableCell>
//                           <Badge variant={isConfigured ? 'default' : 'destructive'}>
//                             {isConfigured ? 'Ready' : 'Needs Configuration'}
//                           </Badge>
//                         </TableCell>
//                         <TableCell>
//                           <div className="flex gap-2">
//                             {!isConfigured && (
//                               <Button
//                                 size="sm"
//                                 variant="outline"
//                                 onClick={() => {
//                                   setMappingTemplate(template);
//                                   setShowPlaceholderMapping(true);
//                                 }}
//                               >
//                                 <Settings className="h-4 w-4" />
//                               </Button>
//                             )}
//                             <Button
//                               size="sm"
//                               variant="outline"
//                               onClick={() => handleDeleteTemplate(template.id)}
//                             >
//                               <Trash2 className="h-4 w-4" />
//                             </Button>
//                           </div>
//                         </TableCell>
//                       </TableRow>
//                     );
//                   })}
//                 </TableBody>
//               </Table>
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {/* Participants Selection */}
//       <Card>
//         <CardHeader>
//           <CardTitle>Select Participants ({participants.length} eligible)</CardTitle>
//         </CardHeader>
//         <CardContent>
//           {participants.length === 0 ? (
//             <Alert>
//               <AlertCircle className="h-4 w-4" />
//               <AlertDescription>
//                 No eligible participants found. Only participants who attended the event can receive certificates.
//               </AlertDescription>
//             </Alert>
//           ) : (
//             <div className="space-y-4">
//               <div className="flex gap-2">
//                 <Button
//                   size="sm"
//                   variant="outline"
//                   onClick={() => setSelectedParticipants(participants.map(p => p.id))}
//                 >
//                   Select All
//                 </Button>
//                 <Button
//                   size="sm"
//                   variant="outline"
//                   onClick={() => setSelectedParticipants([])}
//                 >
//                   Clear Selection
//                 </Button>
//                 <span className="text-sm text-gray-600 flex items-center">
//                   {selectedParticipants.length} of {participants.length} selected
//                 </span>
//               </div>

//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead className="w-12">Select</TableHead>
//                     <TableHead>Name</TableHead>
//                     <TableHead>Email</TableHead>
//                     <TableHead>Attendance Date</TableHead>
//                     <TableHead>Organization</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {participants.map((participant) => (
//                     <TableRow key={participant.id}>
//                       <TableCell>
//                         <input
//                           type="checkbox"
//                           checked={selectedParticipants.includes(participant.id)}
//                           onChange={() => toggleParticipantSelection(participant.id)}
//                           className="rounded"
//                         />
//                       </TableCell>
//                       <TableCell className="font-medium">{participant.name}</TableCell>
//                       <TableCell>{participant.email}</TableCell>
//                       <TableCell>
//                         {participant.attendance_date ?
//                           new Date(participant.attendance_date).toLocaleDateString() :
//                           'Attended'
//                         }
//                       </TableCell>
//                       <TableCell>{participant.organization || '-'}</TableCell>
//                     </TableRow>
//                   ))}
//                 </TableBody>
//               </Table>
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {/* Generate Certificates */}
//       <Card>
//         <CardContent className="pt-6">
//           <Button
//             onClick={handleGenerateCertificates}
//             disabled={isGenerating || !selectedTemplate || participants.length === 0}
//             className="w-full"
//             size="lg"
//           >
//             {isGenerating ? 'Generating Certificates...' : 'Generate Certificates'}
//           </Button>
//         </CardContent>
//       </Card>

//       {/* Placeholder Mapping Modal */}
//       {showPlaceholderMapping && mappingTemplate && (
//         <PlaceholderMappingModal
//           template={mappingTemplate}
//           dataFields={dataFields}
//           onSave={handlePlaceholderMapping}
//           onClose={() => {
//             setShowPlaceholderMapping(false);
//             setMappingTemplate(null);
//           }}
//         />
//       )}
//     </div>
//   );
// };

// interface PlaceholderMappingModalProps {
//   template: CertificateTemplate;
//   dataFields: DataField[];
//   onSave: (mapping: Record<string, string>) => void;
//   onClose: () => void;
// }

// const PlaceholderMappingModal: React.FC<PlaceholderMappingModalProps> = ({
//   template,
//   dataFields,
//   onSave,
//   onClose
// }) => {
//   const [mapping, setMapping] = useState<Record<string, string>>(
//     template.placeholder_mapping || {}
//   );

//   const handleSave = () => {
//     onSave(mapping);
//   };

//   const groupedFields = dataFields.reduce((groups, field) => {
//     if (!groups[field.category]) {
//       groups[field.category] = [];
//     }
//     groups[field.category].push(field);
//     return groups;
//   }, {} as Record<string, DataField[]>);

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//       <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
//         <div className="flex items-center justify-between mb-4">
//           <h2 className="text-2xl font-bold">Configure Placeholder Mapping</h2>
//           <Button variant="outline" onClick={onClose}>Close</Button>
//         </div>

//         <p className="text-gray-600 mb-6">
//           Map the placeholders found in your template to data fields from the database.
//         </p>

//         <div className="space-y-4">
//           {template.extracted_placeholders?.map((placeholder) => (
//             <div key={placeholder} className="border rounded-lg p-4">
//               <Label className="text-lg font-medium">
//                 Placeholder: <code className="bg-gray-100 px-2 py-1 rounded">{"{{" + placeholder + "}}"}</code>
//               </Label>
//               <Select
//                 value={mapping[placeholder] || ''}
//                 onValueChange={(value) => setMapping(prev => ({ ...prev, [placeholder]: value }))}
//               >
//                 <SelectTrigger className="mt-2">
//                   <SelectValue placeholder="Select a data field" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   {Object.entries(groupedFields).map(([category, fields]) => (
//                     <div key={category}>
//                       <div className="px-2 py-1 text-sm font-medium text-gray-500 uppercase">
//                         {category}
//                       </div>
//                       {fields.map((field) => (
//                         <SelectItem key={field.key} value={field.key}>
//                           <div>
//                             <div className="font-medium">{field.label}</div>
//                             <div className="text-sm text-gray-500">{field.description}</div>
//                             {field.example && (
//                               <div className="text-xs text-blue-600">Example: {field.example}</div>
//                             )}
//                           </div>
//                         </SelectItem>
//                       ))}
//                     </div>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>
//           ))}
//         </div>

//         <div className="flex gap-2 mt-6">
//           <Button onClick={handleSave} className="flex-1">
//             Save Mapping
//           </Button>
//           <Button variant="outline" onClick={onClose}>
//             Cancel
//           </Button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CertificateGenerationPage;
