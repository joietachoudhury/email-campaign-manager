import React, { useState, useRef } from 'react';
import { Upload, Send, Clock, CheckCircle, AlertCircle, Eye, Settings, Trash2, Play, Pause } from 'lucide-react';
import './App.css';

const EmailCampaignManager = () => {
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [emailCopy, setEmailCopy] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [sendMode, setSendMode] = useState('bulk'); // bulk, batch, drip
  const [batchSize, setBatchSize] = useState(1000);
  const [dripRate, setDripRate] = useState(1000);
  const [dripInterval, setDripInterval] = useState('daily');
  const [sentEmails, setSentEmails] = useState(new Set());
  const [campaignStatus, setCampaignStatus] = useState('draft'); // draft, sending, paused, completed
  const [previewRecipient, setPreviewRecipient] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('compose'); // compose, campaigns
  const [campaigns, setCampaigns] = useState([]);
  const [currentCampaignId, setCurrentCampaignId] = useState(null);
  const [emailErrors, setEmailErrors] = useState({});
  const fileInputRef = useRef(null);

  const boardySignature = `

---
Best regards,
The Boardy Team

boardy.com
Connect with us on LinkedIn
`;

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });
    return { headers, data };
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const { headers, data } = parseCSV(text);
        setCsvHeaders(headers);
        setCsvData(data);
        if (data.length > 0) {
          setPreviewRecipient(data[0]);
        }
      };
      reader.readAsText(file);
    }
  };

  const getAvailableVariables = () => {
    return csvHeaders.filter(header => 
      !['customEmail', 'custom_email', 'custom-email'].includes(header.toLowerCase())
    );
  };

  const hasCustomEmailColumn = () => {
    return csvHeaders.some(header => 
      ['customEmail', 'custom_email', 'custom-email', 'customCopy', 'custom_copy'].includes(header.toLowerCase())
    );
  };

  const getCustomEmailColumn = () => {
    return csvHeaders.find(header => 
      ['customEmail', 'custom_email', 'custom-email', 'customCopy', 'custom_copy'].includes(header.toLowerCase())
    );
  };

  const insertVariable = (variable) => {
    const textarea = document.getElementById('emailCopy');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = emailCopy;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newText = before + `{${variable}}` + after;
    setEmailCopy(newText);
    
    // Focus back and set cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length + 2, start + variable.length + 2);
    }, 0);
  };

  const replaceVariables = (text, recipient) => {
    let result = text;
    csvHeaders.forEach(header => {
      const placeholder = `{${header}}`;
      const value = recipient[header] || '';
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });
    return result;
  };

  const getEmailPreview = (recipient) => {
    const customEmailColumn = getCustomEmailColumn();
    if (customEmailColumn && recipient[customEmailColumn]) {
      return replaceVariables(recipient[customEmailColumn], recipient) + boardySignature;
    }
    return replaceVariables(emailCopy, recipient) + boardySignature;
  };

  const getSubjectPreview = (recipient) => {
    return replaceVariables(emailSubject, recipient);
  };

  const createNewCampaign = () => {
    const campaignId = Date.now().toString();
    const newCampaign = {
      id: campaignId,
      name: `Campaign ${campaigns.length + 1}`,
      subject: emailSubject,
      content: emailCopy,
      recipients: csvData,
      totalRecipients: csvData.length,
      sentEmails: new Set(),
      errors: {},
      status: 'draft',
      sendMode,
      batchSize,
      dripRate,
      dripInterval,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null
    };
    
    setCampaigns(prev => [newCampaign, ...prev]);
    setCurrentCampaignId(campaignId);
    return newCampaign;
  };

  const handleSendCampaign = () => {
    if (csvData.length === 0) {
      alert('Please upload a CSV file first');
      return;
    }
    if (!emailSubject.trim()) {
      alert('Please enter an email subject');
      return;
    }
    if (!emailCopy.trim() && !hasCustomEmailColumn()) {
      alert('Please enter email copy or ensure your CSV has custom email content');
      return;
    }

    // Create or update campaign
    let campaign;
    if (currentCampaignId) {
      campaign = campaigns.find(c => c.id === currentCampaignId);
      campaign.startedAt = new Date();
    } else {
      campaign = createNewCampaign();
      campaign.startedAt = new Date();
    }

    setCampaignStatus('sending');
    
    // Simulate sending process with error simulation
    let sentCount = sentEmails.size;
    const totalEmails = csvData.length;
    const newSentEmails = new Set(sentEmails);
    const newErrors = { ...emailErrors };

    const sendBatch = () => {
      const remainingEmails = csvData.filter(recipient => !newSentEmails.has(recipient.id || recipient.email));
      const currentBatchSize = sendMode === 'bulk' ? remainingEmails.length : Math.min(batchSize, remainingEmails.length);
      
      for (let i = 0; i < currentBatchSize && i < remainingEmails.length; i++) {
        const recipient = remainingEmails[i];
        const recipientId = recipient.id || recipient.email;
        
        // Simulate occasional errors (5% failure rate for demo)
        if (Math.random() < 0.05) {
          newErrors[recipientId] = {
            email: recipient.email,
            error: 'Invalid email address',
            timestamp: new Date()
          };
        } else {
          newSentEmails.add(recipientId);
          sentCount++;
        }
      }
      
      setSentEmails(new Set(newSentEmails));
      setEmailErrors(newErrors);
      
      // Update campaign in state
      setCampaigns(prev => prev.map(c => 
        c.id === campaign.id 
          ? { ...c, sentEmails: new Set(newSentEmails), errors: newErrors, status: 'sending' }
          : c
      ));
      
      if (sentCount + Object.keys(newErrors).length >= totalEmails) {
        setCampaignStatus('completed');
        setCampaigns(prev => prev.map(c => 
          c.id === campaign.id 
            ? { ...c, status: 'completed', completedAt: new Date() }
            : c
        ));
      } else if (sendMode === 'drip') {
        // Schedule next batch
        setTimeout(sendBatch, dripInterval === 'daily' ? 2000 : 5000); // 2 sec for demo
      }
    };

    sendBatch();
  };

  const pauseCampaign = () => {
    setCampaignStatus('paused');
    setCampaigns(prev => prev.map(c => 
      c.id === currentCampaignId 
        ? { ...c, status: 'paused' }
        : c
    ));
  };

  const resumeCampaign = () => {
    setCampaignStatus('sending');
    setCampaigns(prev => prev.map(c => 
      c.id === currentCampaignId 
        ? { ...c, status: 'sending' }
        : c
    ));
  };

  const resetCampaign = () => {
    setCampaignStatus('draft');
    setSentEmails(new Set());
    setEmailErrors({});
    setCurrentCampaignId(null);
  };

  const loadCampaign = (campaign) => {
    setEmailSubject(campaign.subject);
    setEmailCopy(campaign.content);
    setCsvData(campaign.recipients);
    setCsvHeaders(Object.keys(campaign.recipients[0] || {}));
    setSentEmails(campaign.sentEmails);
    setEmailErrors(campaign.errors);
    setCampaignStatus(campaign.status);
    setSendMode(campaign.sendMode);
    setBatchSize(campaign.batchSize);
    setDripRate(campaign.dripRate);
    setDripInterval(campaign.dripInterval);
    setCurrentCampaignId(campaign.id);
    setActiveTab('compose');
    if (campaign.recipients.length > 0) {
      setPreviewRecipient(campaign.recipients[0]);
    }
  };

  const deleteCampaign = (campaignId) => {
    setCampaigns(prev => prev.filter(c => c.id !== campaignId));
    if (currentCampaignId === campaignId) {
      resetCampaign();
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString();
  };

  const getSuccessRate = (campaign) => {
    const sent = campaign.sentEmails.size;
    const errors = Object.keys(campaign.errors).length;
    const total = campaign.totalRecipients;
    return total > 0 ? Math.round((sent / total) * 100) : 0;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b border-gray-200 p-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Send className="text-blue-600" />
              Email Campaign Manager
            </h1>
            <p className="text-gray-600 mt-2">Upload your email list, craft your message, and send targeted campaigns</p>
            
            {/* Tab Navigation */}
            <div className="flex mt-6 border-b">
              <button
                onClick={() => setActiveTab('compose')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'compose' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Compose Campaign
              </button>
              <button
                onClick={() => setActiveTab('campaigns')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'campaigns' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Past Campaigns ({campaigns.length})
              </button>
            </div>
          </div>

          {activeTab === 'compose' && (
            <div className="p-6 space-y-8">{/* CSV Upload Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Upload className="text-blue-600" />
                Upload Email List
              </h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Upload CSV File
                </button>
                <p className="text-gray-500 mt-2">Support for: id, firstName, email, linkedin, customEmail</p>
              </div>

              {csvData.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        {csvData.length} recipients loaded
                      </span>
                      {hasCustomEmailColumn() && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                          Custom email content detected
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setCsvData([]);
                        setCsvHeaders([]);
                        setSentEmails(new Set());
                        setEmailErrors({});
                        setCampaignStatus('draft');
                      }}
                      className="text-red-600 hover:text-red-700 flex items-center gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear
                    </button>
                  </div>
                  
                  <div className="bg-white rounded border overflow-hidden">
                    <div className="grid grid-cols-4 gap-4 p-3 bg-gray-50 text-sm font-medium text-gray-700">
                      {csvHeaders.slice(0, 4).map(header => (
                        <div key={header}>{header}</div>
                      ))}
                    </div>
                    {csvData.slice(0, 3).map((row, index) => (
                      <div key={index} className="grid grid-cols-4 gap-4 p-3 text-sm border-t">
                        {csvHeaders.slice(0, 4).map(header => (
                          <div key={header} className="truncate">{row[header]}</div>
                        ))}
                      </div>
                    ))}
                    {csvData.length > 3 && (
                      <div className="p-3 text-center text-gray-500 text-sm border-t">
                        And {csvData.length - 3} more rows...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Email Composition */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Composition</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject Line</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="e.g., Hi {firstName}, let's connect!"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {!hasCustomEmailColumn() && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Content</label>
                    <textarea
                      id="emailCopy"
                      value={emailCopy}
                      onChange={(e) => setEmailCopy(e.target.value)}
                      placeholder="Write your email content here. Use {firstName}, {email}, etc. for personalization."
                      rows={8}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                {hasCustomEmailColumn() && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 text-sm">
                      <AlertCircle className="inline h-4 w-4 mr-1" />
                      Custom email content detected in CSV. Each recipient will receive their personalized message.
                    </p>
                  </div>
                )}

                {csvHeaders.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Available Variables</label>
                    <div className="flex flex-wrap gap-2">
                      {getAvailableVariables().map(variable => (
                        <button
                          key={variable}
                          onClick={() => insertVariable(variable)}
                          className="bg-white border border-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-50 transition-colors"
                        >
                          {`{${variable}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sending Options */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="text-blue-600" />
                Sending Options
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Send Mode</label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="bulk"
                        checked={sendMode === 'bulk'}
                        onChange={(e) => setSendMode(e.target.value)}
                        className="mr-2"
                      />
                      Send All at Once
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="batch"
                        checked={sendMode === 'batch'}
                        onChange={(e) => setSendMode(e.target.value)}
                        className="mr-2"
                      />
                      Send in Batches
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="drip"
                        checked={sendMode === 'drip'}
                        onChange={(e) => setSendMode(e.target.value)}
                        className="mr-2"
                      />
                      Drip Campaign
                    </label>
                  </div>
                </div>

                {sendMode === 'batch' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Batch Size</label>
                    <input
                      type="number"
                      value={batchSize}
                      onChange={(e) => setBatchSize(parseInt(e.target.value) || 1000)}
                      className="w-32 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-500 ml-2">emails per batch</span>
                  </div>
                )}

                {sendMode === 'drip' && (
                  <div className="flex gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Emails per Interval</label>
                      <input
                        type="number"
                        value={dripRate}
                        onChange={(e) => setDripRate(parseInt(e.target.value) || 1000)}
                        className="w-32 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Interval</label>
                      <select
                        value={dripInterval}
                        onChange={(e) => setDripInterval(e.target.value)}
                        className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Preview Section */}
            {csvData.length > 0 && previewRecipient && (
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Eye className="text-blue-600" />
                    Email Preview
                  </h2>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    {showPreview ? 'Hide' : 'Show'} Preview
                  </button>
                </div>

                {showPreview && (
                  <div className="bg-white border rounded-lg p-4">
                    <div className="border-b pb-2 mb-4">
                      <div className="text-sm text-gray-600">Subject:</div>
                      <div className="font-medium">{getSubjectPreview(previewRecipient)}</div>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">To: {previewRecipient.email}</div>
                    <div className="whitespace-pre-wrap text-sm">{getEmailPreview(previewRecipient)}</div>
                  </div>
                )}
              </div>
            )}

            {/* Campaign Controls */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Status</h2>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                    campaignStatus === 'draft' ? 'bg-gray-100 text-gray-700' :
                    campaignStatus === 'sending' ? 'bg-blue-100 text-blue-700' :
                    campaignStatus === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {campaignStatus === 'sending' && <Clock className="h-4 w-4 animate-spin" />}
                    {campaignStatus === 'completed' && <CheckCircle className="h-4 w-4" />}
                    {campaignStatus === 'paused' && <Pause className="h-4 w-4" />}
                    {campaignStatus.charAt(0).toUpperCase() + campaignStatus.slice(1)}
                  </div>
                  
                  {csvData.length > 0 && (
                    <div className="text-sm text-gray-600">
                      {sentEmails.size} sent, {Object.keys(emailErrors).length} errors, {csvData.length - sentEmails.size - Object.keys(emailErrors).length} pending
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {campaignStatus === 'draft' && (
                    <button
                      onClick={handleSendCampaign}
                      disabled={csvData.length === 0}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Start Campaign
                    </button>
                  )}
                  
                  {campaignStatus === 'sending' && (
                    <button
                      onClick={pauseCampaign}
                      className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 flex items-center gap-2"
                    >
                      <Pause className="h-4 w-4" />
                      Pause
                    </button>
                  )}
                  
                  {campaignStatus === 'paused' && (
                    <button
                      onClick={resumeCampaign}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Resume
                    </button>
                  )}
                  
                  {(campaignStatus === 'completed' || campaignStatus === 'paused') && (
                    <button
                      onClick={resetCampaign}
                      className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                    >
                      New Campaign
                    </button>
                  )}
                </div>
              </div>

              {csvData.length > 0 && sentEmails.size > 0 && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(sentEmails.size / csvData.length) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Error Summary */}
              {Object.keys(emailErrors).length > 0 && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-red-800 font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Email Errors ({Object.keys(emailErrors).length})
                  </h3>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {Object.entries(emailErrors).slice(0, 5).map(([id, error]) => (
                      <div key={id} className="text-sm text-red-700">
                        {error.email}: {error.error}
                      </div>
                    ))}
                    {Object.keys(emailErrors).length > 5 && (
                      <div className="text-sm text-red-600">
                        And {Object.keys(emailErrors).length - 5} more errors...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            </div>
          )}

          {activeTab === 'campaigns' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Campaign History</h2>
                <button
                  onClick={() => setActiveTab('compose')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  New Campaign
                </button>
              </div>

              {campaigns.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Send className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p>No campaigns yet. Create your first campaign to get started!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map(campaign => (
                    <div key={campaign.id} className="bg-white border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-medium text-gray-900">{campaign.subject}</h3>
                          <p className="text-sm text-gray-500">Created: {formatDate(campaign.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            campaign.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                            campaign.status === 'sending' ? 'bg-blue-100 text-blue-700' :
                            campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {campaign.status}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{campaign.totalRecipients}</div>
                          <div className="text-sm text-gray-500">Total Recipients</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{campaign.sentEmails.size}</div>
                          <div className="text-sm text-gray-500">Emails Sent</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">{Object.keys(campaign.errors).length}</div>
                          <div className="text-sm text-gray-500">Errors</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-700">{getSuccessRate(campaign)}%</div>
                          <div className="text-sm text-gray-500">Success Rate</div>
                        </div>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${getSuccessRate(campaign)}%` }}
                        ></div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Send Mode: {campaign.sendMode} 
                          {campaign.sendMode === 'batch' && ` (${campaign.batchSize} per batch)`}
                          {campaign.sendMode === 'drip' && ` (${campaign.dripRate} per ${campaign.dripInterval})`}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => loadCampaign(campaign)}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Load Campaign
                          </button>
                          <button
                            onClick={() => deleteCampaign(campaign.id)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Show errors if any */}
                      {Object.keys(campaign.errors).length > 0 && (
                        <div className="mt-4 bg-red-50 border border-red-200 rounded p-3">
                          <h4 className="text-red-800 font-medium text-sm mb-2">Recent Errors:</h4>
                          <div className="space-y-1 max-h-20 overflow-y-auto">
                            {Object.entries(campaign.errors).slice(0, 3).map(([id, error]) => (
                              <div key={id} className="text-xs text-red-700">
                                {error.email}: {error.error}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailCampaignManager;